// src/app/api/ai/chat/route.ts
// Streaming chat API — Groq LLM + tool execution

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-guards";
import { getGroqClient, AGENT_MODEL, buildSystemPrompt } from "@/features/ai-agent/agent";
import { CRM_TOOLS } from "@/features/ai-agent/tools";
import {
  agentCreateLead,
  agentCreateBooking,
  agentAddExpense,
  agentQuerySummary,
} from "@/features/ai-agent/agent-actions";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    // Auth check
    await requireUser();

    const body = await req.json() as { messages: ChatCompletionMessageParam[] };
    const { messages } = body;

    if (!messages?.length) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    // Build full message list with system prompt
    const fullMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: buildSystemPrompt() },
      ...messages.slice(-10), // Keep last 10 for context window efficiency
    ];

    const groq = getGroqClient();

    // First LLM call — may return tool calls
    const response = await groq.chat.completions.create({
      model: AGENT_MODEL,
      messages: fullMessages,
      tools: CRM_TOOLS as any,
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens: 1024,
    });

    const assistantMessage = response.choices[0]?.message;
    if (!assistantMessage) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // No tool calls → return text response directly
    if (!assistantMessage.tool_calls?.length) {
      return NextResponse.json({
        role: "assistant",
        content: assistantMessage.content ?? "",
        toolResults: [],
      });
    }

    // Execute tool calls
    const toolResults: Array<{ name: string; result: { ok: boolean; message?: string; error?: string; link?: string } }> = [];
    const toolMessages: ChatCompletionMessageParam[] = [];

    for (const toolCall of assistantMessage.tool_calls) {
      const fnName = toolCall.function.name;
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        args = {};
      }

      let result: { ok: boolean; message?: string; error?: string; link?: string };

      switch (fnName) {
        case "create_lead":
          result = await agentCreateLead(args as any);
          break;
        case "create_booking":
          result = await agentCreateBooking(args as any);
          break;
        case "add_expense":
          result = await agentAddExpense(args as any);
          break;
        case "query_summary":
          result = await agentQuerySummary(args as any);
          break;
        default:
          result = { ok: false, error: `Unknown tool: ${fnName}` };
      }

      toolResults.push({ name: fnName, result });

      toolMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }

    // Second LLM call — summarise what was done
    const secondResponse = await groq.chat.completions.create({
      model: AGENT_MODEL,
      messages: [
        ...fullMessages,
        assistantMessage as ChatCompletionMessageParam,
        ...toolMessages,
      ],
      temperature: 0.3,
      max_tokens: 512,
    });

    const finalContent = secondResponse.choices[0]?.message?.content ?? "";

    return NextResponse.json({
      role: "assistant",
      content: finalContent,
      toolResults,
    });
  } catch (e) {
    console.error("[AI Chat API]", e);
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
