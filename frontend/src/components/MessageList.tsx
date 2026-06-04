import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, ChevronDown, ChevronUp } from "lucide-react";
import { Message } from "../types";
import { useState } from "react";

interface Props {
  messages: Message[];
}

function SourcesPanel({ sources }: { sources: NonNullable<Message["sources"]> }) {
  const [open, setOpen] = useState(false);
  if (sources.length === 0) return null;

  return (
    <div className="mt-2 border-t border-gray-100 pt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {sources.length} source{sources.length > 1 ? "s" : ""}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {sources.map((s, i) => (
            <div key={i} className="bg-gray-50 rounded-md p-2 text-xs">
              <div className="flex justify-between mb-1">
                <span className="font-medium text-gray-700 truncate">{s.source}</span>
                <span className="text-gray-400 ml-2 shrink-0">score: {s.score}</span>
              </div>
              <p className="text-gray-500 line-clamp-3">{s.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MessageList({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div>
          <Bot size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Enterprise RAG Assistant</h2>
          <p className="text-gray-400 text-sm">Upload documents, then ask questions about them.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          {msg.role === "assistant" && (
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center shrink-0 mt-1">
              <Bot size={16} className="text-white" />
            </div>
          )}

          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === "user"
                ? "bg-brand-500 text-white"
                : "bg-white border border-gray-200 text-gray-800"
            }`}
          >
            {msg.role === "assistant" ? (
              <>
                {msg.loading && msg.content === "" ? (
                  <div className="flex gap-1 py-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="prose prose-sm max-w-none"
                  >
                    {msg.content}
                  </ReactMarkdown>
                )}
                {msg.sources && !msg.loading && <SourcesPanel sources={msg.sources} />}
              </>
            ) : (
              <p className="text-sm">{msg.content}</p>
            )}
          </div>

          {msg.role === "user" && (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-1">
              <User size={16} className="text-gray-600" />
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
