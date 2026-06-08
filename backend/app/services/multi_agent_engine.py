from typing import AsyncGenerator, Optional

from app.services.llm import stream_messages
from app.services.retrieval.engine import retrieve, RetrievalStrategy
from app.services.web_search import search_web


AGENT_TEMPLATES: dict[str, list[dict]] = {
    "research_write_review": [
        {
            "name": "Research Agent",
            "role": "You are a research specialist. Gather and synthesize information on the given topic. Be thorough and factual. Present findings clearly.",
            "tool": "web_search",
            "tool_config": {"max_results": 3},
        },
        {
            "name": "Writer Agent",
            "role": "You are a skilled writer. Using the research provided by the previous agent, write a clear, well-structured, engaging response.",
            "tool": "none",
            "tool_config": {},
        },
        {
            "name": "Reviewer Agent",
            "role": "You are a critical reviewer. Review the written content for accuracy, clarity, and completeness. Produce the final polished version.",
            "tool": "none",
            "tool_config": {},
        },
    ],
    "analyze_summarize_format": [
        {
            "name": "Analyst Agent",
            "role": "You are a data analyst. Deeply analyze the input, identify key patterns, insights, and relationships from retrieved documents.",
            "tool": "retrieval",
            "tool_config": {"strategy": "hybrid", "top_k": 5},
        },
        {
            "name": "Summarizer Agent",
            "role": "You are an expert summarizer. Take the analysis and distill it into the most essential points concisely and accurately.",
            "tool": "none",
            "tool_config": {},
        },
        {
            "name": "Formatter Agent",
            "role": "You are a formatting expert. Take the summary and present it with proper structure, headers, and bullet points for maximum readability.",
            "tool": "none",
            "tool_config": {},
        },
    ],
    "search_synthesize_answer": [
        {
            "name": "Search Agent",
            "role": "You are a search specialist. Find and extract the most relevant facts from web sources on the given topic.",
            "tool": "web_search",
            "tool_config": {"max_results": 5},
        },
        {
            "name": "Synthesizer Agent",
            "role": "You are a synthesis expert. Combine all gathered information into a coherent, comprehensive understanding, cross-referencing sources.",
            "tool": "retrieval",
            "tool_config": {"strategy": "naive", "top_k": 3},
        },
        {
            "name": "Answer Agent",
            "role": "You are a clear communicator. Provide a direct, accurate, well-reasoned final answer based on all context gathered by the previous agents.",
            "tool": "none",
            "tool_config": {},
        },
    ],
}


async def run_pipeline(
    agents: list[dict],
    input_text: str,
    collection: str = "default",
    model: Optional[str] = None,
) -> AsyncGenerator[dict, None]:
    yield {
        "type": "pipeline_start",
        "agents": [{"name": a.get("name", f"Agent {i+1}"), "index": i} for i, a in enumerate(agents)],
        "total": len(agents),
    }

    context_history: list[dict] = []
    final_output = ""

    for i, agent_def in enumerate(agents):
        name = agent_def.get("name", f"Agent {i + 1}")
        role = agent_def.get("role", "You are a helpful assistant.")
        tool = agent_def.get("tool", "none")
        tool_config = agent_def.get("tool_config", {})

        yield {"type": "agent_start", "index": i, "name": name}

        tool_context = ""

        if tool == "web_search":
            query = input_text
            max_results = int(tool_config.get("max_results", 3))
            try:
                results = search_web(query, max_results=max_results)
                if results:
                    tool_context = "\n\n".join(
                        f"**{r.get('title', '')}**\n{r.get('body', r.get('snippet', ''))}"
                        for r in results
                    )
                else:
                    tool_context = "[No web results found]"
            except Exception as exc:
                tool_context = f"[Web search error: {exc}]"
            yield {
                "type": "agent_tool",
                "index": i,
                "tool": "web_search",
                "query": query[:120],
                "result_preview": tool_context[:400],
            }

        elif tool == "retrieval":
            query = input_text
            strategy_name = tool_config.get("strategy", "naive")
            top_k = int(tool_config.get("top_k", 3))
            try:
                strategy = RetrievalStrategy(strategy_name)
                chunks, _ = await retrieve(query, collection=collection, strategy=strategy, top_k=top_k)
                if chunks:
                    tool_context = "\n\n---\n\n".join(
                        f"[{c['source']}]\n{c['content']}" for c in chunks
                    )
                else:
                    tool_context = "[No relevant documents found in collection]"
            except Exception as exc:
                tool_context = f"[Retrieval error: {exc}]"
            yield {
                "type": "agent_tool",
                "index": i,
                "tool": "retrieval",
                "query": query[:120],
                "result_preview": tool_context[:400],
            }

        # Build the message list for this agent
        messages: list[dict] = [{"role": "system", "content": role}]

        user_parts = [f"Task: {input_text}"]
        if tool_context:
            user_parts.append(f"\nRelevant information gathered:\n{tool_context}")
        if context_history:
            prior = "\n\n".join(
                f"[{entry['agent']}]:\n{entry['content']}" for entry in context_history
            )
            user_parts.append(f"\nPrevious agents' outputs:\n{prior}")
            user_parts.append("\nBuild on the previous agents' work using your specialized role.")

        messages.append({"role": "user", "content": "\n".join(user_parts)})

        full_output = ""
        try:
            async for token in stream_messages(messages, model=model):
                full_output += token
                yield {"type": "agent_token", "index": i, "token": token}
        except Exception as exc:
            full_output = f"[Agent error: {exc}]"
            yield {"type": "agent_token", "index": i, "token": full_output}

        context_history.append({"agent": name, "content": full_output})
        final_output = full_output
        yield {"type": "agent_done", "index": i, "output": full_output[:2000]}

    yield {"type": "done", "final_output": final_output[:3000]}
