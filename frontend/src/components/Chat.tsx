import { useState, useRef, KeyboardEvent } from "react";
import { Send, Trash2, Upload } from "lucide-react";
import { MessageList } from "./MessageList";
import { DocumentUpload } from "./DocumentUpload";
import { RetrievalSelector, RetrievalConfig } from "./RetrievalSelector";
import { useChat } from "../hooks/useChat";

interface Props {
  collection: string;
  onCollectionChange: () => void;
  model: string;
}

export function Chat({ collection, onCollectionChange, model }: Props) {
  const [retrieval, setRetrieval] = useState<RetrievalConfig>({ strategy: "naive", topK: 5 });
  const { messages, loading, sendMessage, clearMessages } = useChat(collection, model, retrieval);
  const [input, setInput] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    textareaRef.current?.focus();
    await sendMessage(q);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <header className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200">
        <div>
          <h2 className="font-semibold text-gray-800 text-sm">Chat</h2>
          <p className="text-xs text-gray-400">Collection: {collection}</p>
        </div>
        <div className="flex gap-2 items-center">
          <RetrievalSelector value={retrieval} onChange={setRetrieval} />
          <button
            onClick={() => setShowUpload((s) => !s)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              showUpload ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Upload size={14} />
            Upload
          </button>
          <button
            onClick={clearMessages}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-sm transition-colors"
          >
            <Trash2 size={14} />
            Clear
          </button>
        </div>
      </header>

      {showUpload && (
        <div className="border-b border-gray-200 bg-gray-50">
          <DocumentUpload collection={collection} onUploaded={() => { onCollectionChange(); setShowUpload(false); }} />
        </div>
      )}

      <MessageList messages={messages} />

      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`Ask about documents in "${collection}"…`}
            className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 max-h-32 overflow-y-auto"
            style={{ minHeight: "42px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl p-2.5 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Shift+Enter for newline · Enter to send</p>
      </div>
    </div>
  );
}
