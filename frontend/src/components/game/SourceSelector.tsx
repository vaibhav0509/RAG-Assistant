import { useState, useRef, useEffect } from "react";
import { ChevronDown, Globe, FileText, Brain, Check } from "lucide-react";

const SOURCE_OPTIONS = [
  { id: "doc",   label: "Documents",       icon: FileText, color: "text-blue-500",   bg: "bg-blue-50"   },
  { id: "web",   label: "Web Search",      icon: Globe,    color: "text-orange-500", bg: "bg-orange-50" },
  { id: "model", label: "Model Knowledge", icon: Brain,    color: "text-purple-500", bg: "bg-purple-50" },
];

interface Props {
  value: string[];
  onChange: (sources: string[]) => void;
}

export function SourceSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: string) => {
    if (value.includes(id)) {
      if (value.length === 1) return; // keep at least one
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const label = value.length === 3 ? "All Sources" : `${value.length} Source${value.length > 1 ? "s" : ""}`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors shadow-sm"
      >
        <span className="flex gap-1">
          {SOURCE_OPTIONS.filter((s) => value.includes(s.id)).map((s) => (
            <s.icon key={s.id} size={13} className={s.color} />
          ))}
        </span>
        {label}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-52 p-1">
          {SOURCE_OPTIONS.map((opt) => {
            const selected = value.includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => toggle(opt.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  selected ? opt.bg : "hover:bg-gray-50"
                }`}
              >
                <opt.icon size={15} className={selected ? opt.color : "text-gray-400"} />
                <span className={selected ? "font-medium text-gray-800" : "text-gray-600"}>{opt.label}</span>
                {selected && <Check size={13} className="ml-auto text-green-500" />}
              </button>
            );
          })}
          <div className="border-t border-gray-100 mt-1 pt-1 px-3 py-1.5">
            <p className="text-xs text-gray-400">At least 1 source required</p>
          </div>
        </div>
      )}
    </div>
  );
}
