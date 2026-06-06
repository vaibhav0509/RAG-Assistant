"""
ReAct (Reasoning + Acting) agent loop.

Each iteration:
  1. LLM emits Thought → Action → Action Input
  2. We run the tool and return the Observation
  3. Repeat until LLM emits Final Answer or max_iterations reached
"""

import re
from typing import AsyncGenerator, Optional

from app.services.llm import llm_complete
from app.services.vector_store import vector_store
from app.services.web_search import search_web

MAX_ITERATIONS = 7

SYSTEM_PROMPT = """You are a helpful AI agent that answers questions by using tools step by step.

You have access to these tools:
- search_documents: Search the user's uploaded documents for relevant information
- search_web: Search the internet for current information
- calculate: Evaluate a mathematical expression (e.g. "2 + 2 * 10")
- answer_directly: Answer from your own knowledge when no tools are needed

STRICT OUTPUT FORMAT — you must follow this exactly:

Thought: [your reasoning about what to do next]
Action: [exactly one tool name from the list above]
Action Input: [the input string for that tool]

When you have gathered enough information to answer fully:

Thought: I now have enough information to provide a complete answer.
Final Answer: [your complete, well-formatted answer using all gathered information]

Rules:
- Always start with a Thought
- Never skip the Action Input line
- Never call a tool you already called with the same input
- Give the Final Answer as soon as you have enough information
- Keep Action Inputs concise and specific"""


# ─── output parser ────────────────────────────────────────────────────────

def _parse(text: str) -> dict:
    text = text.strip()

    if "Final Answer:" in text:
        answer = text.split("Final Answer:", 1)[-1].strip()
        thought_m = re.search(r"Thought:(.*?)(?=Final Answer:)", text, re.DOTALL)
        return {
            "type": "final",
            "thought": thought_m.group(1).strip() if thought_m else "",
            "answer": answer,
        }

    thought_m = re.search(r"Thought:(.*?)(?=Action:|$)", text, re.DOTALL)
    action_m  = re.search(r"Action:(.*?)(?=Action Input:|$)", text, re.DOTALL)
    input_m   = re.search(r"Action Input:(.*?)$", text, re.DOTALL)

    if action_m and input_m:
        return {
            "type": "action",
            "thought":      thought_m.group(1).strip() if thought_m else "",
            "action":       action_m.group(1).strip().lower().replace(" ", "_"),
            "action_input": input_m.group(1).strip(),
        }

    return {"type": "thought", "thought": text}


# ─── tools ───────────────────────────────────────────────────────────────

VALID_TOOLS = {"search_documents", "search_web", "calculate", "answer_directly"}


async def _run_tool(tool: str, tool_input: str, collection: str) -> str:
    if tool == "search_documents":
        results = vector_store.query(collection, tool_input, top_k=4)
        if not results:
            return "No relevant documents found in the collection."
        return "\n\n".join(
            f"[{r['source']} chunk {r['chunk']}]:\n{r['content'][:400]}"
            for r in results
        )

    elif tool == "search_web":
        results = search_web(tool_input, max_results=4)
        if not results:
            return "Web search returned no results."
        return "\n\n".join(
            f"{r.get('title', 'Result')}:\n{r.get('body', r.get('snippet', ''))[:400]}"
            for r in results
        )

    elif tool == "calculate":
        try:
            safe_globals = {"__builtins__": {}}
            result = eval(tool_input, safe_globals, {})  # noqa: S307
            return f"Result: {result}"
        except Exception as e:
            return f"Calculation error: {e}"

    elif tool == "answer_directly":
        return tool_input

    return f"Unknown tool '{tool}'. Available: {', '.join(VALID_TOOLS)}"


# ─── main agent loop ──────────────────────────────────────────────────────

async def run_agent(
    question: str,
    collection: str,
    model: Optional[str] = None,
) -> AsyncGenerator[dict, None]:
    """
    Yields dicts:
      {"type": "thought",     "content": str}
      {"type": "action",      "tool": str, "input": str}
      {"type": "observation", "content": str}
      {"type": "answer",      "content": str}
      {"type": "error",       "content": str}
    """
    conversation: list[dict] = []
    seen_calls: set[str] = set()

    for iteration in range(MAX_ITERATIONS):
        # Build messages
        if iteration == 0:
            user_content = f"Question: {question}"
        else:
            user_content = "Continue your reasoning based on the observation above."

        messages = (
            [{"role": "system", "content": SYSTEM_PROMPT}]
            + conversation
            + [{"role": "user", "content": user_content}]
        )

        raw = await llm_complete(messages, model)
        parsed = _parse(raw)

        # Emit thought
        if parsed.get("thought"):
            yield {"type": "thought", "content": parsed["thought"]}

        # Final answer
        if parsed["type"] == "final":
            yield {"type": "answer", "content": parsed["answer"]}
            return

        # Action
        if parsed["type"] == "action":
            tool  = parsed["action"]
            t_in  = parsed["action_input"]

            # Guard against repeated identical calls
            call_key = f"{tool}::{t_in}"
            if call_key in seen_calls:
                yield {"type": "observation", "content": "(Already called this — using previous result.)"}
                conversation.append({"role": "assistant", "content": raw})
                conversation.append({"role": "user",      "content": "Observation: You already called that tool with the same input. Move toward a Final Answer."})
                continue
            seen_calls.add(call_key)

            yield {"type": "action", "tool": tool, "input": t_in}

            observation = await _run_tool(tool, t_in, collection)
            yield {"type": "observation", "content": observation}

            conversation.append({"role": "assistant", "content": raw})
            conversation.append({"role": "user",      "content": f"Observation: {observation}"})
            continue

        # Bare thought with no action — nudge toward action
        conversation.append({"role": "assistant", "content": raw})
        conversation.append({"role": "user",      "content": "Please choose a tool or provide your Final Answer."})

    yield {"type": "error", "content": "Agent reached maximum iterations without a final answer."}
