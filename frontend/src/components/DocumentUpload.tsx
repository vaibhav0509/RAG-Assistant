import { useState, useRef } from "react";
import { Upload, X, CheckCircle, AlertCircle, ChevronDown } from "lucide-react";
import { uploadDocument } from "../api/client";

interface Props {
  collection: string;
  onUploaded: () => void;
}

interface UploadState {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  message?: string;
}

const CHUNK_STRATEGIES = [
  {
    id: "recursive",
    label: "Recursive",
    short: "Recursive",
    color: "text-blue-600",
    desc: "Sentence-boundary sliding window (balanced, default)",
  },
  {
    id: "semantic",
    label: "Semantic (Paragraph)",
    short: "Semantic",
    color: "text-purple-600",
    desc: "Preserves paragraph structure, merges small sections",
  },
  {
    id: "sentence",
    label: "Sentence Window",
    short: "Sentence",
    color: "text-green-600",
    desc: "Groups sentences into windows, ideal for Q&A",
  },
  {
    id: "fixed",
    label: "Fixed Size",
    short: "Fixed",
    color: "text-orange-600",
    desc: "Exact character-size chunks, fastest to ingest",
  },
];

export function DocumentUpload({ collection, onUploaded }: Props) {
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [dragging, setDragging] = useState(false);
  const [colName, setColName] = useState(collection);
  const [chunkStrategy, setChunkStrategy] = useState("recursive");
  const [strategyOpen, setStrategyOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeStrategy = CHUNK_STRATEGIES.find((s) => s.id === chunkStrategy) ?? CHUNK_STRATEGIES[0];

  const processFiles = async (files: File[]) => {
    const newUploads: UploadState[] = files.map((f) => ({ file: f, status: "pending" }));
    setUploads((prev) => [...prev, ...newUploads]);

    for (const file of files) {
      setUploads((prev) =>
        prev.map((u) => (u.file === file ? { ...u, status: "uploading" } : u))
      );
      try {
        const result = await uploadDocument(file, colName, chunkStrategy);
        setUploads((prev) =>
          prev.map((u) =>
            u.file === file
              ? {
                  ...u,
                  status: "done",
                  message: `${result.chunks_added} chunks · ${result.chunk_strategy}`,
                }
              : u
          )
        );
        onUploaded();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setUploads((prev) =>
          prev.map((u) => (u.file === file ? { ...u, status: "error", message: msg } : u))
        );
      }
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div className="p-4 space-y-3">
      {/* Collection + chunking strategy row */}
      <div className="flex gap-2 items-center flex-wrap">
        <label className="text-sm text-gray-600 shrink-0">Collection:</label>
        <input
          value={colName}
          onChange={(e) => setColName(e.target.value)}
          className="flex-1 min-w-[120px] text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="default"
        />

        {/* Chunk strategy picker */}
        <div className="relative shrink-0">
          <button
            onClick={() => setStrategyOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-lg text-sm text-gray-700 transition-colors"
          >
            <span className={`font-medium text-xs ${activeStrategy.color}`}>{activeStrategy.short}</span>
            <ChevronDown size={11} className={`transition-transform ${strategyOpen ? "rotate-180" : ""}`} />
          </button>

          {strategyOpen && (
            <div className="absolute top-full mt-1 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-72 p-1.5">
              <p className="text-xs text-gray-400 px-2 py-1 font-semibold uppercase tracking-wide">Chunking Strategy</p>
              {CHUNK_STRATEGIES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setChunkStrategy(s.id); setStrategyOpen(false); }}
                  className={`w-full flex items-start gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    chunkStrategy === s.id ? "bg-gray-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${s.color}`}>{s.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
                  </div>
                  {chunkStrategy === s.id && (
                    <span className="text-green-500 text-xs mt-0.5">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragging ? "border-brand-500 bg-brand-50" : "border-gray-300 hover:border-brand-400"
        }`}
      >
        <Upload className="mx-auto mb-2 text-gray-400" size={24} />
        <p className="text-sm text-gray-600">Drop files or click to upload</p>
        <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT, MD</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,.rst"
          className="hidden"
          onChange={(e) => processFiles(Array.from(e.target.files ?? []))}
        />
      </div>

      {/* Upload list */}
      {uploads.length > 0 && (
        <div className="space-y-1">
          {uploads.map((u, i) => (
            <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-gray-50">
              {u.status === "uploading" && (
                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              )}
              {u.status === "done" && <CheckCircle size={16} className="text-green-500" />}
              {u.status === "error" && <AlertCircle size={16} className="text-red-500" />}
              {u.status === "pending" && <div className="w-4 h-4 rounded-full bg-gray-300" />}
              <span className="flex-1 truncate text-gray-700">{u.file.name}</span>
              {u.message && (
                <span className={`text-xs ${u.status === "error" ? "text-red-500" : "text-green-600"}`}>
                  {u.message}
                </span>
              )}
              <button onClick={() => setUploads((prev) => prev.filter((_, j) => j !== i))}>
                <X size={14} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
