"use client"

import { useState, useRef, useEffect } from "react"
import { Send, X, Sparkles } from "lucide-react"
import { NebulaLogo } from "@/components/ui/nebula-logo"

interface Msg {
  role: "user" | "assistant"
  content: string
}

const SUGGESTIONS = [
  "Which agents help with M&A due diligence?",
  "Recommend a model for tax provision work.",
  "What's in the Audit & Assurance catalog?",
]

export function AssistantWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm the Nebula-X Assistant. Ask me about agents, models, and workflows for audit, tax, risk, deal advisory, and more.",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  async function send(text: string) {
    const msg = text.trim()
    if (!msg || loading) return
    const history = messages.filter((m) => m.content).slice(-8)
    const next = [...messages, { role: "user" as const, content: msg }]
    setMessages(next)
    setInput("")
    setLoading(true)
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history }),
      })
      const data = await res.json().catch(() => ({}))
      const reply = res.ok
        ? data.reply
        : data.error || "Sorry, I couldn't reach the assistant just now."
      setMessages((m) => [...m, { role: "assistant", content: reply }])
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "The assistant is temporarily unavailable." },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Nebula-X Assistant"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent-light)] shadow-lg shadow-[var(--primary)]/30 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <NebulaLogo className="h-7 w-7 text-[#0C0C0C]" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[560px] w-[400px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-[var(--primary)]/25 bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-[var(--primary)]/12 to-transparent px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent-light)]">
                <NebulaLogo className="h-5 w-5 text-[#0C0C0C]" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-bold text-foreground">Nebula-X Assistant</p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--primary)]">
                  Powered by Agent 365
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-[var(--primary)] px-3.5 py-2 text-sm text-[#0C0C0C]"
                      : "max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-border bg-secondary px-3.5 py-2 text-sm text-foreground"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-border bg-secondary px-3.5 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--primary)] [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--primary)] [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--primary)]" />
                </div>
              </div>
            )}
            {messages.length <= 1 && !loading && (
              <div className="space-y-2 pt-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="flex w-full items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-[var(--primary)]/40 hover:text-foreground"
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the Nebula-X catalog…"
              className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[var(--primary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/40"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)] text-[#0C0C0C] transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
