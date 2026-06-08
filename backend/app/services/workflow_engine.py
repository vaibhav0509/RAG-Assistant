from collections import defaultdict, deque
from typing import AsyncGenerator, Optional

from app.services.llm import llm_complete
from app.services.retrieval.engine import retrieve, RetrievalStrategy
from app.services.web_search import search_web


async def run_workflow(
    nodes: list[dict],
    edges: list[dict],
    input_text: str,
    collection: str = "default",
    model: Optional[str] = None,
) -> AsyncGenerator[dict, None]:
    node_map = {n["id"]: n for n in nodes}

    predecessors: dict[str, list[str]] = defaultdict(list)
    successors: dict[str, list[str]] = defaultdict(list)
    in_degree: dict[str, int] = defaultdict(int)

    for edge in edges:
        src, tgt = edge["source"], edge["target"]
        predecessors[tgt].append(src)
        successors[src].append(tgt)
        in_degree[tgt] += 1

    # Kahn's topological sort
    queue: deque[str] = deque([n["id"] for n in nodes if in_degree[n["id"]] == 0])
    topo_order: list[str] = []
    while queue:
        nid = queue.popleft()
        topo_order.append(nid)
        for succ in successors[nid]:
            in_degree[succ] -= 1
            if in_degree[succ] == 0:
                queue.append(succ)

    if len(topo_order) != len(nodes):
        yield {"type": "error", "node_id": None, "message": "Workflow has a cycle — cannot execute."}
        return

    outputs: dict[str, str] = {}

    yield {"type": "start", "total": len(topo_order), "order": topo_order}

    for nid in topo_order:
        node = node_map[nid]
        ntype = node.get("type", "output")
        config = node.get("config", {})

        yield {"type": "node_start", "node_id": nid, "node_type": ntype, "label": config.get("label", ntype)}

        try:
            preds = predecessors[nid]
            first_pred = outputs.get(preds[0], input_text) if preds else input_text

            if ntype == "input":
                output = input_text

            elif ntype == "llm":
                prompt = config.get("prompt", "Answer this: {{input}}")
                for pid, pout in outputs.items():
                    prompt = prompt.replace(f"{{{{{pid}}}}}", pout)
                prompt = prompt.replace("{{input}}", input_text)
                output = await llm_complete([{"role": "user", "content": prompt}], model=model)

            elif ntype == "retrieval":
                coll = config.get("collection", collection) or collection
                strategy = RetrievalStrategy(config.get("strategy", "naive"))
                top_k = int(config.get("top_k", 3))
                chunks, _ = await retrieve(first_pred, collection=coll, strategy=strategy, top_k=top_k)
                if chunks:
                    output = "\n\n---\n\n".join(
                        f"[{c['source']}]\n{c['content']}" for c in chunks
                    )
                else:
                    output = "[No documents found in collection]"

            elif ntype == "web_search":
                max_results = int(config.get("max_results", 3))
                results = search_web(first_pred, max_results=max_results)
                if results:
                    output = "\n\n---\n\n".join(
                        f"**{r.get('title', '')}**\n{r.get('body', r.get('snippet', ''))}" for r in results
                    )
                else:
                    output = "[No web results found]"

            elif ntype == "transform":
                op = config.get("operation", "join")
                if op == "join":
                    sep = config.get("separator", "\n\n")
                    parts = [outputs[pid] for pid in preds if pid in outputs]
                    output = sep.join(parts) if parts else first_pred
                elif op == "truncate":
                    output = first_pred[: int(config.get("max_chars", 500))]
                elif op == "template":
                    tmpl = config.get("template", "{{input}}")
                    output = tmpl.replace("{{input}}", input_text)
                    for pid, pout in outputs.items():
                        output = output.replace(f"{{{{{pid}}}}}", pout)
                else:
                    output = first_pred

            elif ntype == "output":
                output = first_pred

            else:
                output = first_pred

            outputs[nid] = output
            yield {"type": "node_done", "node_id": nid, "output": output[:3000]}

        except Exception as exc:
            msg = str(exc)[:300]
            outputs[nid] = f"[Error: {msg}]"
            yield {"type": "node_error", "node_id": nid, "message": msg}

    yield {"type": "done", "outputs": {k: v[:500] for k, v in outputs.items()}}
