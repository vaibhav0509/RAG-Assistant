export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  loading?: boolean;
}

export interface Source {
  content: string;
  source: string;
  chunk: number;
  score: number;
}

export interface Collection {
  name: string;
  document_count: number;
}
