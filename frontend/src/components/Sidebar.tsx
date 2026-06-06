import { useState, useEffect } from "react";
import { Database, Trash2, RefreshCw } from "lucide-react";
import { Collection } from "../types";
import { fetchCollections, deleteCollection } from "../api/client";

interface Props {
  activeCollection: string;
  onSelectCollection: (name: string) => void;
}

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api/v1";

export function Sidebar({ activeCollection, onSelectCollection }: Props) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeModel, setActiveModel] = useState<string>("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchCollections();
      setCollections(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    fetch(`${BASE}/status`, { headers: { "X-API-Key": "enterprise-rag-secret" } })
      .then((r) => r.json())
      .then((d) => { if (d.model) setActiveModel(d.model); })
      .catch(() => {});
  }, []);

  const handleDelete = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete collection "${name}"?`)) return;
    await deleteCollection(name);
    if (activeCollection === name) onSelectCollection("default");
    load();
  };

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold text-brand-500">RAG Assistant</h1>
        <p className="text-xs text-gray-400 mt-1">
          Powered by <span className="text-gray-300 font-medium">{activeModel || "…"}</span> + ChromaDB
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Collections
          </span>
          <button
            onClick={load}
            className="text-gray-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {collections.length === 0 && (
          <p className="text-xs text-gray-500 mt-2">No collections yet. Upload documents.</p>
        )}

        {collections.map((col) => (
          <div
            key={col.name}
            onClick={() => onSelectCollection(col.name)}
            className={`flex items-center justify-between p-2 rounded-lg mb-1 cursor-pointer transition-colors ${
              activeCollection === col.name
                ? "bg-brand-600 text-white"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Database size={14} className="shrink-0" />
              <div className="min-w-0">
                <p className="text-sm truncate">{col.name}</p>
                <p className="text-xs opacity-70">{col.document_count} chunks</p>
              </div>
            </div>
            <button
              onClick={(e) => handleDelete(col.name, e)}
              className="text-gray-500 hover:text-red-400 transition-colors shrink-0 ml-1"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-gray-700 text-xs text-gray-500">
        Active: <span className="text-gray-300 font-medium">{activeCollection}</span>
      </div>
    </aside>
  );
}
