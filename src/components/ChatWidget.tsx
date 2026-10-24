"use client";

import { useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";
interface Message {
  role: Role;
  content: string;
}

const GREETING: Message = {
  role: "assistant",
  content:
    "Hi, I'm your Campus Facilities Copilot. Ask me about building energy, water usage, or waste management.",
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to the newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  // Focus the input when the panel opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setError(null);
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send history minus the greeting so the model gets real turns only.
        body: JSON.stringify({ messages: next.filter((m) => m !== GREETING) }),
      });

      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || data.error) {
        throw new Error(data.error ?? `Request failed (${res.status}).`);
      }

      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply ?? "No response." },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-accent/20 border border-accent/40 text-accent shadow-lg shadow-black/40 backdrop-blur flex items-center justify-center hover:bg-accent/30 transition-colors"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col rounded-xl border border-border bg-panel shadow-2xl shadow-black/50 font-mono">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-accent text-xs font-semibold">
              AI
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-100">
                Facilities Copilot
              </div>
              <div className="text-[11px] text-muted">
                Energy · Water · Waste
              </div>
            </div>
            <span className="ml-auto h-2 w-2 rounded-full bg-good" title="online" />
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m, i) => (
              <MessageBubble key={i} role={m.role} content={m.content} />
            ))}

            {loading && <TypingIndicator />}

            {error && (
              <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-2">
            <div className="flex items-end gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={loading}
                placeholder="Ask about a building…"
                className="flex-1 rounded-lg border border-border bg-panel2 px-3 py-2 text-sm text-slate-100 placeholder:text-muted outline-none focus:border-accent/50 disabled:opacity-60"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="btn btn-accent disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                {loading ? (
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MessageBubble({ role, content }: { role: Role; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
          isUser
            ? "bg-accent2/20 text-accent2"
            : "bg-accent/20 text-accent"
        }`}
      >
        {isUser ? "You" : "AI"}
      </span>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "bg-accent2/15 text-slate-100"
            : "bg-panel2 text-slate-200"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-accent text-[10px] font-semibold">
        AI
      </span>
      <div className="flex items-center gap-1 rounded-lg bg-panel2 px-3 py-2.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
      </div>
    </div>
  );
}
