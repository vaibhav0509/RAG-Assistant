import { useEffect, useState } from "react";
import { Cpu, ChevronDown } from "lucide-react";
import { fetchModels } from "../api/client";

interface Model {
  name: string;
  size_gb: number;
}

interface Props {
  value: string;
  onChange: (model: string) => void;
}

export function ModelSelector({ value, onChange }: Props) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModels()
      .then((data) => {
        setModels(data);
        if (!value && data.length > 0) onChange(data[0].name);
      })
      .catch(() => setModels([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-400">
        <Cpu size={14} />
        <span>Loading…</span>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-lg text-sm text-red-500">
        <Cpu size={14} />
        <span>No models found</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center">
        <Cpu size={14} className="text-gray-400" />
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-7 pr-7 py-1.5 bg-gray-100 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
      >
        {models.map((m) => (
          <option key={m.name} value={m.name}>
            {m.name} ({m.size_gb} GB)
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        <ChevronDown size={13} className="text-gray-400" />
      </div>
    </div>
  );
}
