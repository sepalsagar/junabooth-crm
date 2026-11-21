"use client";

// src/features/ai-agent/components/agent-widget.tsx
// Floating AI chat widget — opens from any page in the dashboard

import { useRef, useState, useTransition, useEffect } from "react";
import { BotIcon, XIcon, SendIcon, SparklesIcon, Loader2Icon, ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolResults?: Array<{
    name: string;
    result: { ok: boolean; message?: string; error?: string; link?: string };
  }>;
}

const QUICK_PROMPTS = [
  "Show me today's leads",
  "What are my upcoming events?",
  "Any overdue collections?",
  "Show quick stats",
];

function ToolResultPill({
  result,
}: {
  result: { ok: boolean; message?: string; error?: string; link?: string };
}) {
  return (
    <div
      className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
        result.ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      <p className="whitespace-pre-line leading-relaxed">
        {result.ok ? result.message : `❌ ${result.error}`}
      </p>
      {result.ok && result.link && (
        <Link
          href={result.link}
          className="mt-1.5 inline-flex items-center gap-1 font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
        >
          View in CRM <ExternalLinkIcon className="size-3" />
        </Link>
      )}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2`}>
      {!isUser && (
        <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <BotIcon className="size-3.5" />
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? "order-first" : ""}`}>
        <div
          className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm bg-muted text-foreground"
          }`}
        >
          {msg.content}
        </div>
        {msg.toolResults?.map((tr, i) => (
          <ToolResultPill key={i} result={tr.result} />
        ))}
      </div>
    </div>
  );
}

export function AgentWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hey! I'm JunaBot 👋 Tell me about a new lead, booking, or expense — I'll add it to the CRM for you. Or ask me anything about your data.",
    },
  ]);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

  const send = (text: string) => {
    if (!text.trim() || isPending) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    startTransition(async () => {
      try {
        const apiMessages = [...messages, userMsg]
          .filter((m) => m.role !== "tool")
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
        });

        if (!res.ok) {
          const err = await res.json() as { error?: string };
          throw new Error(err.error ?? "Request failed");
        }

        const data = await res.json() as {
          content: string;
          toolResults?: Array<{ name: string; result: { ok: boolean; message?: string; error?: string; link?: string } }>;
        };

        const assistantMsg: Message = {
          id: Date.now().toString() + "_a",
          role: "assistant",
          content: data.content,
          toolResults: data.toolResults,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + "_err",
            role: "assistant",
            content: `Sorry, something went wrong: ${e instanceof Error ? e.message : "unknown error"}. Please try again.`,
          },
        ]);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
          open ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
        }`}
        aria-label="Open AI Assistant"
        title="JunaBot — AI Assistant"
      >
        {open ? <XIcon className="size-5" /> : <SparklesIcon className="size-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-[360px] max-w-[calc(100vw-24px)] flex-col rounded-2xl border bg-background shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-2.5 rounded-t-2xl border-b bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground/20">
              <BotIcon className="size-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold leading-none">JunaBot</p>
              <p className="mt-0.5 text-[10px] opacity-75">AI Assistant · Groq Cloud</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1 opacity-70 hover:opacity-100 hover:bg-primary-foreground/10 transition-colors"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex h-80 flex-col gap-3 overflow-y-auto p-4 scroll-smooth">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {isPending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                  <Loader2Icon className="size-3.5 animate-spin text-primary" />
                </div>
                <span className="italic">JunaBot is thinking…</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 border-t px-4 py-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  disabled={isPending}
                  className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 border-t px-3 py-3">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="New lead, booking, expense…"
              className="h-9 flex-1 rounded-full bg-muted text-sm border-0 px-4 focus-visible:ring-1"
              disabled={isPending}
            />
            <Button
              onClick={() => send(input)}
              disabled={!input.trim() || isPending}
              size="sm"
              className="h-9 w-9 shrink-0 rounded-full p-0"
            >
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SendIcon className="size-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
