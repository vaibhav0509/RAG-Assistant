import { createContext, useContext, useReducer, useCallback, ReactNode } from "react";

export type EventStatus = "info" | "running" | "success" | "error" | "warn";

export type EventTag =
  | "SYSTEM" | "QUERY" | "EMBED" | "RETRIEVAL"
  | "CONTEXT" | "MODEL" | "STREAM" | "DONE"
  | "WEB" | "GAME" | "ANSWER" | "DB" | "RAG"
  | "AGENT" | "TOOL" | "RESULT" | "PORTFOLIO";

export interface ProcessEvent {
  id: string;
  ts: Date;
  tag: EventTag;
  message: string;
  status: EventStatus;
}

interface State {
  events: ProcessEvent[];
}

type Action =
  | { type: "ADD"; event: ProcessEvent }
  | { type: "CLEAR" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD":
      return { events: [action.event, ...state.events].slice(0, 120) };
    case "CLEAR":
      return { events: [] };
    default:
      return state;
  }
}

interface ContextValue {
  events: ProcessEvent[];
  log: (tag: EventTag, message: string, status?: EventStatus) => void;
  clear: () => void;
}

const Ctx = createContext<ContextValue | null>(null);

export function ProcessProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { events: [] });

  const log = useCallback((tag: EventTag, message: string, status: EventStatus = "info") => {
    dispatch({
      type: "ADD",
      event: { id: crypto.randomUUID(), ts: new Date(), tag, message, status },
    });
  }, []);

  const clear = useCallback(() => dispatch({ type: "CLEAR" }), []);

  return <Ctx.Provider value={{ events: state.events, log, clear }}>{children}</Ctx.Provider>;
}

export function useProcess() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProcess must be used within ProcessProvider");
  return ctx;
}
