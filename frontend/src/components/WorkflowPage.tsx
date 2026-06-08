import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  BackgroundVariant,
  MarkerType,
  type Connection,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  MessageSquare, Brain, Search, Globe, Wrench, CheckSquare,
  Play, Save, FolderOpen, Plus, CheckCircle2, XCircle, Loader2, Trash2,
} from "lucide-react";
import { streamWorkflow } from "../api/client";
import { useProcess } from "../context/ProcessContext";

// ── Types ────────────────────────────────────────────────────────────────────

type WFNodeType = "input" | "llm" | "retrieval" | "web_search" | "transform" | "output";

interface WFNodeData {
  nodeType: WFNodeType;
  label: string;
  config: Record<string, string | number>;
  status: "idle" | "running" | "done" | "error";
  output?: string;
  [key: string]: unknown;
}

// ── Node metadata ─────────────────────────────────────────────────────────────

const NODE_META: Record<WFNodeType, {
  icon: React.ElementType;
  header: string;
  border: string;
  badge: string;
  description: string;
  defaultConfig: Record<string, string | number>;
  defaultLabel: string;
}> = {
  input: {
    icon: MessageSquare,
    header: "bg-blue-600",
    border: "border-blue-300",
    badge: "bg-blue-100 text-blue-700",
    description: "Starting point — passes the run input into the workflow.",
    defaultConfig: {},
    defaultLabel: "User Input",
  },
  llm: {
    icon: Brain,
    header: "bg-violet-600",
    border: "border-violet-300",
    badge: "bg-violet-100 text-violet-700",
    description: "Call the LLM with a prompt. Use {{nodeId}} to reference outputs.",
    defaultConfig: { prompt: "Answer this question using the context:\n{{input}}" },
    defaultLabel: "LLM Call",
  },
  retrieval: {
    icon: Search,
    header: "bg-emerald-600",
    border: "border-emerald-300",
    badge: "bg-emerald-100 text-emerald-700",
    description: "Query ChromaDB for relevant document chunks.",
    defaultConfig: { collection: "default", strategy: "naive", top_k: 3 },
    defaultLabel: "Retrieval",
  },
  web_search: {
    icon: Globe,
    header: "bg-orange-500",
    border: "border-orange-300",
    badge: "bg-orange-100 text-orange-700",
    description: "Search the web via DuckDuckGo.",
    defaultConfig: { max_results: 3 },
    defaultLabel: "Web Search",
  },
  transform: {
    icon: Wrench,
    header: "bg-gray-600",
    border: "border-gray-300",
    badge: "bg-gray-100 text-gray-700",
    description: "Join, truncate, or template multiple inputs.",
    defaultConfig: { operation: "join", separator: "\n\n" },
    defaultLabel: "Transform",
  },
  output: {
    icon: CheckSquare,
    header: "bg-teal-600",
    border: "border-teal-300",
    badge: "bg-teal-100 text-teal-700",
    description: "Final output — displays the result of this workflow.",
    defaultConfig: {},
    defaultLabel: "Output",
  },
};

// ── Custom node component ─────────────────────────────────────────────────────

function WorkflowNode({ data, selected }: NodeProps) {
  const d = data as WFNodeData;
  const meta = NODE_META[d.nodeType];
  const Icon = meta.icon;

  return (
    <div
      className={`rounded-xl border-2 shadow-md w-52 bg-white transition-all ${
        selected ? "border-brand-500 ring-2 ring-brand-200" : meta.border
      } ${d.status === "running" ? "shadow-lg shadow-violet-200" : ""}`}
    >
      {d.nodeType !== "input" && (
        <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-gray-400 !border-white" />
      )}

      {/* Header */}
      <div className={`${meta.header} rounded-t-[10px] px-3 py-2 flex items-center gap-2`}>
        <Icon size={13} className="text-white shrink-0" />
        <span className="text-white text-xs font-bold truncate flex-1">{d.label}</span>
        {d.status === "running" && <Loader2 size={12} className="text-white shrink-0 animate-spin" />}
        {d.status === "done"    && <CheckCircle2 size={12} className="text-green-300 shrink-0" />}
        {d.status === "error"   && <XCircle size={12} className="text-red-300 shrink-0" />}
      </div>

      {/* Body */}
      <div className="px-3 py-2 min-h-[40px]">
        {d.output ? (
          <p className="text-[11px] text-gray-600 line-clamp-3 leading-relaxed">{d.output}</p>
        ) : (
          <p className="text-[11px] text-gray-400 italic leading-relaxed">{meta.description}</p>
        )}
      </div>

      {d.nodeType !== "output" && (
        <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-gray-400 !border-white" />
      )}
    </div>
  );
}

const NODE_TYPES = { workflowNode: WorkflowNode };

// ── Default example workflow ──────────────────────────────────────────────────

const defaultNodes: Node[] = [
  { id: "input-1",     type: "workflowNode", position: { x: 220, y: 40  }, data: { nodeType: "input",     label: "User Question", config: {},                                                             status: "idle" } },
  { id: "retrieval-1", type: "workflowNode", position: { x: 60,  y: 170 }, data: { nodeType: "retrieval", label: "Search Docs",   config: { collection: "default", strategy: "naive", top_k: 3 },        status: "idle" } },
  { id: "web-1",       type: "workflowNode", position: { x: 380, y: 170 }, data: { nodeType: "web_search",label: "Web Search",    config: { max_results: 3 },                                             status: "idle" } },
  { id: "transform-1", type: "workflowNode", position: { x: 220, y: 310 }, data: { nodeType: "transform", label: "Merge Context", config: { operation: "join", separator: "\n\n---\n\n" },                status: "idle" } },
  { id: "llm-1",       type: "workflowNode", position: { x: 220, y: 450 }, data: { nodeType: "llm",       label: "Generate Answer",config: { prompt: "Context:\n{{transform-1}}\n\nQuestion: {{input-1}}\n\nAnswer:" }, status: "idle" } },
  { id: "output-1",    type: "workflowNode", position: { x: 220, y: 590 }, data: { nodeType: "output",    label: "Final Answer",  config: {},                                                             status: "idle" } },
];

const edgeMeta = { markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" }, style: { stroke: "#94a3b8" }, animated: false };

const defaultEdges: Edge[] = [
  { id: "e1", source: "input-1",     target: "retrieval-1", ...edgeMeta },
  { id: "e2", source: "input-1",     target: "web-1",       ...edgeMeta },
  { id: "e3", source: "retrieval-1", target: "transform-1", ...edgeMeta },
  { id: "e4", source: "web-1",       target: "transform-1", ...edgeMeta },
  { id: "e5", source: "transform-1", target: "llm-1",       ...edgeMeta },
  { id: "e6", source: "input-1",     target: "llm-1",       ...edgeMeta },
  { id: "e7", source: "llm-1",       target: "output-1",    ...edgeMeta },
];

// ── Node palette ──────────────────────────────────────────────────────────────

function NodePalette({ onAdd }: { onAdd: (type: WFNodeType) => void }) {
  return (
    <div className="w-44 shrink-0 bg-white border-r border-gray-200 flex flex-col p-3 gap-1 overflow-y-auto">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Add Node</p>
      {(Object.keys(NODE_META) as WFNodeType[]).map((type) => {
        const meta = NODE_META[type];
        const Icon = meta.icon;
        return (
          <button
            key={type}
            onClick={() => onAdd(type)}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium border transition-all hover:scale-[1.02] ${meta.badge} border-transparent`}
          >
            <Icon size={13} />
            {meta.defaultLabel}
            <Plus size={10} className="ml-auto opacity-50" />
          </button>
        );
      })}
    </div>
  );
}

// ── Node config panel ─────────────────────────────────────────────────────────

function ConfigPanel({
  node,
  onUpdate,
  onDelete,
}: {
  node: Node | null;
  onUpdate: (id: string, data: Partial<WFNodeData>) => void;
  onDelete: (id: string) => void;
}) {
  if (!node) {
    return (
      <div className="w-64 shrink-0 bg-gray-50 border-l border-gray-200 flex items-center justify-center">
        <p className="text-xs text-gray-400 text-center px-4">Click a node to configure it</p>
      </div>
    );
  }

  const d = node.data as WFNodeData;
  const meta = NODE_META[d.nodeType];

  const set = (key: string, val: string | number) =>
    onUpdate(node.id, { config: { ...d.config, [key]: val } });

  return (
    <div className="w-64 shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-y-auto">
      <div className={`${meta.header} px-4 py-3 flex items-center gap-2 shrink-0`}>
        <meta.icon size={14} className="text-white" />
        <span className="text-white text-sm font-bold">{d.label}</span>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Label */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Label</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400"
            value={d.label}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
          />
        </div>

        {/* LLM: prompt */}
        {d.nodeType === "llm" && (
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Prompt</label>
            <p className="text-[10px] text-gray-400 mb-1">Use <code className="bg-gray-100 px-1 rounded">{"{{nodeId}}"}</code> to inject node outputs.</p>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs h-36 resize-none focus:outline-none focus:ring-1 focus:ring-brand-400 font-mono"
              value={String(d.config.prompt ?? "")}
              onChange={(e) => set("prompt", e.target.value)}
            />
          </div>
        )}

        {/* Retrieval */}
        {d.nodeType === "retrieval" && (
          <>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Collection</label>
              <input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400" value={String(d.config.collection ?? "default")} onChange={(e) => set("collection", e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Strategy</label>
              <select className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400" value={String(d.config.strategy ?? "naive")} onChange={(e) => set("strategy", e.target.value)}>
                <option value="naive">Naive Dense</option>
                <option value="hybrid">Hybrid BM25</option>
                <option value="hyde">HyDE</option>
                <option value="multi_query">Multi-Query</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Top-K</label>
              <input type="number" min={1} max={10} className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400" value={Number(d.config.top_k ?? 3)} onChange={(e) => set("top_k", Number(e.target.value))} />
            </div>
          </>
        )}

        {/* Web Search */}
        {d.nodeType === "web_search" && (
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Max Results</label>
            <input type="number" min={1} max={10} className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400" value={Number(d.config.max_results ?? 3)} onChange={(e) => set("max_results", Number(e.target.value))} />
          </div>
        )}

        {/* Transform */}
        {d.nodeType === "transform" && (
          <>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Operation</label>
              <select className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400" value={String(d.config.operation ?? "join")} onChange={(e) => set("operation", e.target.value)}>
                <option value="join">Join (merge inputs)</option>
                <option value="truncate">Truncate</option>
                <option value="template">Template</option>
              </select>
            </div>
            {d.config.operation === "join" && (
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Separator</label>
                <input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-400" value={String(d.config.separator ?? "\n\n")} onChange={(e) => set("separator", e.target.value)} />
              </div>
            )}
            {d.config.operation === "truncate" && (
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Max Chars</label>
                <input type="number" min={50} className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400" value={Number(d.config.max_chars ?? 500)} onChange={(e) => set("max_chars", Number(e.target.value))} />
              </div>
            )}
            {d.config.operation === "template" && (
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Template</label>
                <textarea className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs h-24 resize-none font-mono focus:outline-none focus:ring-1 focus:ring-brand-400" value={String(d.config.template ?? "{{input}}")} onChange={(e) => set("template", e.target.value)} />
              </div>
            )}
          </>
        )}

        {/* Node ID reference hint */}
        <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
          <p className="text-[10px] text-gray-400">Node ID: <code className="text-gray-600">{node.id}</code></p>
          <p className="text-[10px] text-gray-400 mt-0.5">Reference in prompts: <code className="text-gray-600">{`{{${node.id}}}`}</code></p>
        </div>

        <button
          onClick={() => onDelete(node.id)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
        >
          <Trash2 size={11} /> Delete node
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function WorkflowPage({ active }: { active: boolean }) {
  const { log } = useProcess();
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [runInput, setRunInput]         = useState("What is RAG and how does it work?");
  const [running, setRunning]           = useState(false);
  const abortRef                        = useRef<(() => void) | null>(null);

  const onConnect = useCallback(
    (conn: Connection) => setEdges((es) => addEdge({ ...conn, ...edgeMeta }, es)),
    [setEdges],
  );

  const addNode = useCallback((type: WFNodeType) => {
    const meta = NODE_META[type];
    const id   = `${type}-${Date.now()}`;
    const newNode: Node = {
      id,
      type: "workflowNode",
      position: { x: 200 + Math.random() * 100, y: 200 + Math.random() * 100 },
      data: {
        nodeType: type,
        label:    meta.defaultLabel,
        config:   { ...meta.defaultConfig },
        status:   "idle",
      },
    };
    setNodes((ns) => [...ns, newNode]);
    setSelectedId(id);
  }, [setNodes]);

  const updateNode = useCallback((id: string, patch: Partial<WFNodeData>) => {
    setNodes((ns) =>
      ns.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    );
  }, [setNodes]);

  const deleteNode = useCallback((id: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
  }, [setNodes, setEdges]);

  const resetStatuses = useCallback(() => {
    setNodes((ns) =>
      ns.map((n) => ({ ...n, data: { ...n.data, status: "idle", output: undefined } })),
    );
  }, [setNodes]);

  const runWorkflow = useCallback(async () => {
    if (running) {
      abortRef.current?.();
      return;
    }
    if (!runInput.trim()) return;

    resetStatuses();
    setRunning(true);
    log("AGENT", `Running workflow — ${nodes.length} nodes`, "running");

    const payload = {
      nodes: nodes.map((n) => {
        const d = n.data as WFNodeData;
        return { id: n.id, type: d.nodeType, config: { ...d.config, label: d.label } };
      }),
      edges: edges.map((e) => ({ source: e.source, target: e.target })),
      input: runInput,
    };

    let stopped = false;
    abortRef.current = () => { stopped = true; };

    try {
      for await (const event of streamWorkflow(payload)) {
        if (stopped) break;

        if (event.type === "node_start") {
          setNodes((ns) =>
            ns.map((n) => n.id === event.node_id ? { ...n, data: { ...n.data, status: "running", output: undefined } } : n),
          );
          log("TOOL", `▶ ${event.label} (${event.node_type})`, "running");
        } else if (event.type === "node_done") {
          setNodes((ns) =>
            ns.map((n) => n.id === event.node_id ? { ...n, data: { ...n.data, status: "done", output: event.output } } : n),
          );
          log("RESULT", `✓ ${event.node_id}: ${String(event.output).slice(0, 80)}…`, "success");
        } else if (event.type === "node_error") {
          setNodes((ns) =>
            ns.map((n) => n.id === event.node_id ? { ...n, data: { ...n.data, status: "error", output: event.message } } : n),
          );
          log("AGENT", `✗ ${event.node_id}: ${event.message}`, "error");
        } else if (event.type === "error") {
          log("AGENT", event.message ?? "Workflow error", "error");
        } else if (event.type === "done") {
          log("AGENT", "Workflow complete", "success");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log("AGENT", `Workflow failed: ${msg}`, "error");
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [running, runInput, nodes, edges, resetStatuses, log]);

  const saveWorkflow = useCallback(() => {
    const data = {
      nodes: nodes.map((n) => ({ id: n.id, type: "workflowNode", position: n.position, data: n.data })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "workflow.json";
    a.click();
  }, [nodes, edges]);

  const loadWorkflow = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const { nodes: ns, edges: es } = JSON.parse(text);
      setNodes(ns.map((n: Node) => ({ ...n, data: { ...n.data as WFNodeData, status: "idle", output: undefined } })));
      setEdges(es);
      setSelectedId(null);
    };
    input.click();
  }, [setNodes, setEdges]);

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Toolbar */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3">
        <div className="flex-1">
          <input
            className="w-full max-w-lg border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400 placeholder-gray-400"
            placeholder="Workflow input — what to pass into the first node…"
            value={runInput}
            onChange={(e) => setRunInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !running && runWorkflow()}
          />
        </div>
        <button
          onClick={runWorkflow}
          disabled={!runInput.trim() && !running}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            running
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40"
          }`}
        >
          {running ? (
            <><Loader2 size={14} className="animate-spin" /> Stop</>
          ) : (
            <><Play size={14} /> Run</>
          )}
        </button>
        <button onClick={saveWorkflow} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          <Save size={13} /> Save
        </button>
        <button onClick={loadWorkflow} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          <FolderOpen size={13} /> Load
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex overflow-hidden">
        <NodePalette onAdd={addNode} />

        <div className="flex-1 relative">
          {active && (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={NODE_TYPES}
              onNodeClick={(_, node) => setSelectedId(node.id)}
              onPaneClick={() => setSelectedId(null)}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              deleteKeyCode="Delete"
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
              <Controls showInteractive={false} />
            </ReactFlow>
          )}

          {/* Empty state hint */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-gray-400 text-sm font-medium">Canvas is empty</p>
                <p className="text-gray-300 text-xs mt-1">Click a node type in the palette to add it</p>
              </div>
            </div>
          )}
        </div>

        <ConfigPanel node={selectedNode} onUpdate={updateNode} onDelete={deleteNode} />
      </div>
    </div>
  );
}
