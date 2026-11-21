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

function parseTextToolCalls(content: string): Array<{ name: string; args: Record<string, unknown> }> {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];

  // Match: <tool_call> <function=NAME> <parameter=KEY> VALUE </parameter> ... </function> </tool_call>
  const toolCallRegex = /<tool_call>[\s\S]*?<function=([a-zA-Z0-9_]+)>([\s\S]*?)<\/function>[\s\S]*?<\/tool_call>/gi;
  let match;
  while ((match = toolCallRegex.exec(content)) !== null) {
    const fnName = match[1];
    const body = match[2];
    const args: Record<string, unknown> = {};

    const paramRegex = /<parameter=([a-zA-Z0-9_]+)>\s*([\s\S]*?)\s*<\/parameter>/gi;
    let paramMatch;
    while ((paramMatch = paramRegex.exec(body)) !== null) {
      const key = paramMatch[1];
      const val = paramMatch[2].trim();
      args[key] = val;
    }

    calls.push({ name: fnName, args });
  }

  // Also match JSON in tool_call: <tool_call> { "name": "...", "arguments": { ... } } </tool_call>
  if (calls.length === 0) {
    const jsonRegex = /<tool_call>[\s\S]*?(\{[\s\S]*?\})[\s\S]*?<\/tool_call>/gi;
    let jsonMatch;
    while ((jsonMatch = jsonRegex.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.name) {
          calls.push({ name: parsed.name, args: parsed.arguments || parsed.parameters || {} });
        }
      } catch {}
    }
  }

  return calls;
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    await requireUser();

    const body = (await req.json().catch(() => ({}))) as { messages?: ChatCompletionMessageParam[] };
    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];

    if (!rawMessages.length) {
      return NextResponse.json({ error: "Please enter a message to begin." }, { status: 400 });
    }

    // Sanitize and bound message sizes (prevent token-exhaustion or overflow DOS)
    const sanitizedMessages: ChatCompletionMessageParam[] = rawMessages
      .slice(-8)
      .filter((m) => m && typeof m.content === "string")
      .map((m) => ({
        role: m.role === "user" || m.role === "assistant" ? m.role : "user",
        content: (m.content as string).replace(/\0/g, "").slice(0, 4000),
      }));

    if (!sanitizedMessages.length) {
      return NextResponse.json({ error: "Message content cannot be empty." }, { status: 400 });
    }

    // Build full message list with system prompt
    const fullMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: buildSystemPrompt() },
      ...sanitizedMessages,
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

    // Normalize tool calls: from formal tool_calls or fallback text tags
    let rawCalls: Array<{ id: string; name: string; args: Record<string, unknown> }> = [];

    if (assistantMessage.tool_calls?.length) {
      rawCalls = assistantMessage.tool_calls.map((tc) => {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {}
        return { id: tc.id, name: tc.function.name, args };
      });
    } else if (assistantMessage.content && assistantMessage.content.includes("<tool_call>")) {
      const parsed = parseTextToolCalls(assistantMessage.content);
      rawCalls = parsed.map((p, idx) => ({
        id: `call_${idx}_${Date.now()}`,
        name: p.name,
        args: p.args,
      }));
    }

    // No tool calls from either source → return text response directly
    if (rawCalls.length === 0) {
      return NextResponse.json({
        role: "assistant",
        content: assistantMessage.content ?? "",
        toolResults: [],
      });
    }

    // Execute tool calls
    const toolResults: Array<{ name: string; result: { ok: boolean; message?: string; error?: string; link?: string } }> = [];
    const toolMessages: ChatCompletionMessageParam[] = [];

    for (const toolCall of rawCalls) {
      const fnName = toolCall.name;
      const args = toolCall.args;
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

    // Clean any residual <tool_call>...</tool_call> tags from assistant text
    let cleanOriginalContent = (assistantMessage.content ?? "")
      .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "")
      .trim();

    // Second LLM call — summarise what was done
    let finalContent = "";
    try {
      const secondAssistantMsg: ChatCompletionMessageParam = {
        role: "assistant",
        content: cleanOriginalContent || "Executing requested operations...",
      };

      const secondResponse = await groq.chat.completions.create({
        model: AGENT_MODEL,
        messages: [
          ...fullMessages,
          secondAssistantMsg,
          ...toolMessages,
        ],
        temperature: 0.3,
        max_tokens: 512,
      });

      finalContent = (secondResponse.choices[0]?.message?.content ?? "")
        .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "")
        .trim();
    } catch {
      // If second completion encounters issues, synthesize friendly summary from tool results
      finalContent = toolResults
        .filter((tr) => tr.result.ok && tr.result.message)
        .map((tr) => tr.result.message)
        .join("\n\n");
    }

    if (!finalContent) {
      finalContent = toolResults
        .filter((tr) => tr.result.ok && tr.result.message)
        .map((tr) => tr.result.message)
        .join("\n\n");
    }

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
