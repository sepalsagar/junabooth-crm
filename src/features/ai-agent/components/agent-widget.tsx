"use client";

// src/features/ai-agent/components/agent-widget.tsx
// Fully draggable floating AI chat widget — move anywhere with mouse or touch

import { useRef, useState, useTransition, useEffect } from "react";
import {
  BotIcon,
  XIcon,
  SendIcon,
  SparklesIcon,
  Loader2Icon,
  ExternalLinkIcon,
  GripHorizontalIcon,
} from "lucide-react";
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
  "Total expenses this month?",
  "Partner revenue & shares",
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
      content:
        "Hey! I'm JunaBot 👋 Tell me about a new lead, booking, or expense — I'll record it in the CRM for you. Or ask me about expenses, partner shares, upcoming events, or stats.",
    },
  ]);
  const [isPending, startTransition] = useTransition();

  // ── Drag state for the floating button ────────────────────────────────────
  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingBtn, setIsDraggingBtn] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    moved: boolean;
  }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    moved: false,
  });

  // ── Drag state for the chat dialog panel ──────────────────────────────────
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelDragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

  // ── Floating Button Drag Handlers ─────────────────────────────────────────
  const handleButtonPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return; // Only primary mouse button
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: rect.left,
      initialY: rect.top,
      moved: false,
    };

    const handlePointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - dragStartRef.current.startX;
      const dy = ev.clientY - dragStartRef.current.startY;

      if (!dragStartRef.current.moved && Math.hypot(dx, dy) > 5) {
        dragStartRef.current.moved = true;
        setIsDraggingBtn(true);
      }

      if (dragStartRef.current.moved) {
        const nextX = Math.max(12, Math.min(window.innerWidth - 68, dragStartRef.current.initialX + dx));
        const nextY = Math.max(12, Math.min(window.innerHeight - 68, dragStartRef.current.initialY + dy));
        setBtnPos({ x: nextX, y: nextY });
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      setTimeout(() => setIsDraggingBtn(false), 50);

      // If user did NOT drag more than 5px, treat as click and toggle panel
      if (!dragStartRef.current.moved) {
        setOpen((v) => !v);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // ── Chat Panel Header Drag Handlers ───────────────────────────────────────
  const handlePanelHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    // Don't drag if clicking the close icon button
    if ((e.target as HTMLElement).closest("button")) return;

    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;

    panelDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: rect.left,
      initialY: rect.top,
    };

    const handlePanelMove = (ev: PointerEvent) => {
      const dx = ev.clientX - panelDragRef.current.startX;
      const dy = ev.clientY - panelDragRef.current.startY;
      const w = rect.width;
      const h = rect.height;

      const nextX = Math.max(8, Math.min(window.innerWidth - w - 8, panelDragRef.current.initialX + dx));
      const nextY = Math.max(8, Math.min(window.innerHeight - h - 8, panelDragRef.current.initialY + dy));
      setPanelPos({ x: nextX, y: nextY });
    };

    const handlePanelUp = () => {
      window.removeEventListener("pointermove", handlePanelMove);
      window.removeEventListener("pointerup", handlePanelUp);
    };

    window.addEventListener("pointermove", handlePanelMove);
    window.addEventListener("pointerup", handlePanelUp);
  };

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
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error || `Request failed with status ${res.status}`);
        }

        const data = (await res.json()) as {
          content: string;
          toolResults?: Array<{
            name: string;
            result: { ok: boolean; message?: string; error?: string; link?: string };
          }>;
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
            content: `Notice: ${e instanceof Error ? e.message : "Something went wrong"}. Please try again.`,
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
      {/* Draggable Floating Button */}
      <button
        ref={btnRef}
        onPointerDown={handleButtonPointerDown}
        style={
          btnPos
            ? { left: `${btnPos.x}px`, top: `${btnPos.y}px`, touchAction: "none" }
            : { bottom: "24px", right: "24px", touchAction: "none" }
        }
        className={`fixed z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-transform select-none ${
          isDraggingBtn
            ? "cursor-grabbing scale-105 shadow-2xl ring-4 ring-primary/30"
            : "cursor-grab hover:scale-105 active:scale-95"
        } ${open ? "bg-muted text-foreground border border-border" : "bg-primary text-primary-foreground"}`}
        aria-label="JunaBot AI Assistant (drag anywhere)"
        title="JunaBot — Drag anywhere or click to chat"
      >
        {open ? <XIcon className="size-5 pointer-events-none" /> : <SparklesIcon className="size-6 pointer-events-none" />}
      </button>

      {/* Draggable Chat Dialog Panel */}
      {open && (
        <div
          ref={panelRef}
          style={
            panelPos
              ? { left: `${panelPos.x}px`, top: `${panelPos.y}px` }
              : btnPos
              ? {
                  left: `${Math.max(12, Math.min(window.innerWidth - 372, btnPos.x - 310))}px`,
                  top: `${Math.max(12, btnPos.y - 460 > 10 ? btnPos.y - 460 : btnPos.y + 70)}px`,
                }
              : { bottom: "96px", right: "24px" }
          }
          className="fixed z-50 flex w-[370px] max-w-[calc(100vw-24px)] flex-col rounded-2xl border bg-background shadow-2xl overflow-hidden"
        >
          {/* Draggable Header */}
          <div
            onPointerDown={handlePanelHeaderPointerDown}
            className="flex items-center gap-2.5 bg-primary px-3.5 py-3 text-primary-foreground cursor-grab active:cursor-grabbing select-none"
            style={{ touchAction: "none" }}
            title="Drag header to move chat window"
          >
            <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100">
              <GripHorizontalIcon className="size-4" />
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground/20 shrink-0">
              <BotIcon className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-none truncate">JunaBot</p>
              <p className="mt-0.5 text-[10px] opacity-75 truncate">AI Assistant · Drag header to move</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 opacity-70 hover:opacity-100 hover:bg-primary-foreground/15 transition-colors shrink-0"
              title="Close chat"
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
                <span className="italic">JunaBot is checking the database…</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompt pills */}
          {messages.length <= 2 && (
            <div className="flex flex-wrap gap-1.5 border-t bg-muted/20 px-3 py-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  disabled={isPending}
                  className="rounded-full border border-primary/25 bg-background px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input field */}
          <div className="flex items-center gap-2 border-t px-3 py-3 bg-card">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about finances or describe a lead/booking…"
              className="h-9 flex-1 rounded-full bg-muted text-xs border-0 px-4 focus-visible:ring-1"
              disabled={isPending}
            />
            <Button
              type="button"
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
