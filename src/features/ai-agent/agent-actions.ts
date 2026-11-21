"use server";

// src/features/ai-agent/agent-actions.ts
// Server actions that execute the AI tool calls against the real DB

import { requireRole } from "@/lib/auth-guards";
import { createLead } from "@/features/leads/actions";
import { createExpense } from "@/features/expenses/actions";
import { db } from "@/lib/db";
import { nextCode } from "@/lib/codes";
import { startOfTodayIST } from "@/lib/dates";
import { inr } from "@/lib/format";
import { parseMonth } from "@/features/metrics/filters";
import { getFirmCapitalSummary } from "@/features/capital/queries";
import { getCashPosition, getMonthlyPLData } from "@/features/metrics/queries";

export type AgentToolResult =
  | { ok: true; message: string; link?: string }
  | { ok: false; error: string };

// ── Create Lead ──────────────────────────────────────────────────────────────
export async function agentCreateLead(args: {
  clientName: string;
  phone: string;
  city?: string;
  source?: string;
  notes?: string;
  targetDate?: string;
}): Promise<AgentToolResult> {
  try {
    // Normalize phone
    const phone = args.phone.replace(/\D/g, "").replace(/^(91|0)/, "").slice(0, 10);

    const result = await createLead({
      clientName: args.clientName.trim(),
      phone,
      city: args.city?.trim() ?? "",
      source: args.source ?? "OTHER",
      notes: args.notes?.trim() ?? "",
      targetDate: args.targetDate ? new Date(args.targetDate) : undefined,
    });

    if (!result.ok) return { ok: false, error: result.error };

    const warning = result.duplicateWarning ? ` ⚠️ ${result.duplicateWarning}` : "";
    return {
      ok: true,
      message: `✅ Lead created: **${args.clientName}** (${result.data.code}) from ${args.city ?? "unknown city"}.${warning}`,
      link: `/leads/${result.data.code}`,
    };
  } catch (e) {
    return { ok: false, error: `Failed to create lead: ${e instanceof Error ? e.message : "unknown error"}` };
  }
}

// ── Create Booking ───────────────────────────────────────────────────────────
export async function agentCreateBooking(args: {
  clientName: string;
  phone: string;
  city?: string;
  venue?: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  basePrice: number;
  advance?: number;
  notes?: string;
}): Promise<AgentToolResult> {
  try {
    await requireRole(["PARTNER", "SALES"]);
    const phone = args.phone.replace(/\D/g, "").replace(/^(91|0)/, "").slice(0, 10);

    const booking = await db.$transaction(async (tx) => {
      const code = await nextCode("JB", tx);
      return await tx.booking.create({
        data: {
          code,
          clientName: args.clientName.trim(),
          phone,
          city: args.city?.trim() ?? null,
          venue: args.venue?.trim() ?? null,
          eventDate: new Date(args.eventDate),
          startTime: args.startTime ?? null,
          endTime: args.endTime ?? null,
          basePrice: Math.round(args.basePrice),
          travelCharge: 0,
          discount: 0,
          packageName: "Custom",
          status: "CONFIRMED",
          notes: args.notes?.trim() ?? null,
          activities: {
            create: {
              type: "CREATED",
              message: `Booking created via AI Agent for ${args.clientName} on ${args.eventDate}`,
            },
          },
        },
      });
    });

    // Record advance payment if provided
    if (args.advance && args.advance > 0) {
      await db.payment.create({
        data: {
          bookingId: booking.id,
          amount: Math.round(args.advance),
          kind: "ADVANCE",
          mode: "UPI",
          paidOn: new Date(),
        },
      });
    }

    return {
      ok: true,
      message: `✅ Booking created: **${args.clientName}** (${booking.code}) on ${new Date(args.eventDate).toLocaleDateString("en-IN")} for ₹${args.basePrice.toLocaleString("en-IN")}${args.advance ? `. Advance: ₹${args.advance.toLocaleString("en-IN")} recorded.` : "."}`,
      link: `/bookings/${booking.code}`,
    };
  } catch (e) {
    return { ok: false, error: `Failed to create booking: ${e instanceof Error ? e.message : "unknown error"}` };
  }
}

// ── Add Expense ──────────────────────────────────────────────────────────────
export async function agentAddExpense(args: {
  category: string;
  amount: number;
  spentOn: string;
  paidBy?: string;
  note?: string;
}): Promise<AgentToolResult> {
  try {
    const result = await createExpense({
      category: args.category,
      amount: Math.round(args.amount),
      spentOn: new Date(args.spentOn),
      paidBy: args.paidBy?.trim() ?? undefined,
      note: args.note?.trim() ?? undefined,
    });

    if (!result.ok) return { ok: false, error: result.error };

    return {
      ok: true,
      message: `✅ Expense recorded: ₹${args.amount.toLocaleString("en-IN")} for **${args.category.replace(/_/g, " ")}** on ${new Date(args.spentOn).toLocaleDateString("en-IN")}.`,
      link: `/expenditure`,
    };
  } catch (e) {
    return { ok: false, error: `Failed to record expense: ${e instanceof Error ? e.message : "unknown error"}` };
  }
}

// ── Query Summary ─────────────────────────────────────────────────────────────
export async function agentQuerySummary(args: {
  queryType: string;
  month?: string;
}): Promise<AgentToolResult> {
  try {
    await requireRole(["PARTNER", "SALES"]);
    const now = new Date();
    const startToday = startOfTodayIST(now);

    switch (args.queryType) {
      case "monthly_expenses": {
        const targetMonth = parseMonth(args.month);
        const [yearStr, monthStr] = targetMonth.split("-");
        const y = parseInt(yearStr, 10);
        const m = parseInt(monthStr, 10);
        const startOfMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

        const expenses = await db.expense.findMany({
          where: {
            voidedAt: null,
            spentOn: { gte: startOfMonth, lte: endOfMonth },
          },
          select: {
            category: true,
            amount: true,
          },
        });

        const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

        // Group by category
        const catMap = new Map<string, number>();
        for (const e of expenses) {
          catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.amount);
        }

        const sortedCats = Array.from(catMap.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([cat, amt]) => `• ${cat.replace(/_/g, " ")}: ${inr(amt)}`);

        const catDetails = sortedCats.length > 0 ? `\n\n**Category Breakdown:**\n${sortedCats.join("\n")}` : "";

        return {
          ok: true,
          message: `💸 **Total Expenses for ${targetMonth}:** ${inr(totalExpense)} across ${expenses.length} recorded items.${catDetails}`,
          link: "/expenditure",
        };
      }

      case "partner_revenue":
      case "partner_financials": {
        const [firmCap, cashPos] = await Promise.all([
          getFirmCapitalSummary(),
          getCashPosition(),
        ]);

        const partnerLines = firmCap.partners.map((p) => {
          const shareStr = p.share !== null ? `${p.share.toFixed(1)}%` : "0.0%";
          return `• **${p.name}**: Injected ${inr(p.injected)} | Withdrawn ${inr(p.withdrawn)} | Net ${inr(p.net)} (Share: ${shareStr})`;
        });

        return {
          ok: true,
          message: `💼 **Partner Financials & Equity Shares:**\n\n${partnerLines.join("\n")}\n\n**Firm Summary:**\n• Total Injected: ${inr(firmCap.firmInjected)}\n• Total Withdrawn: ${inr(firmCap.firmWithdrawn)}\n• Net Invested: ${inr(firmCap.firmNet)}\n• Current Cash Float: ${inr(cashPos.total)}`,
          link: "/partners",
        };
      }

      case "monthly_pl": {
        const targetMonth = parseMonth(args.month);
        const pl = await getMonthlyPLData(targetMonth);
        const cur = pl.current;

        return {
          ok: true,
          message: `📈 **P&L Summary for ${targetMonth}:**\n• Billed Revenue: ${inr(cur.revenue)} (${cur.bookingCount} events)\n• Direct Event Costs: ${inr(cur.directCosts)}\n• Gross Profit: ${inr(cur.grossProfit)} (${cur.grossMargin ?? 0}%)\n• Overheads: ${inr(cur.overheads.total)}\n• **Net Profit:** ${inr(cur.netProfit)} (${cur.netMargin ?? 0}% margin)`,
          link: "/reports",
        };
      }

      case "today_leads": {
        const leads = await db.lead.findMany({
          where: { createdAt: { gte: startToday } },
          select: { code: true, clientName: true, city: true, source: true, status: true },
          orderBy: { createdAt: "desc" },
        });
        if (leads.length === 0) return { ok: true, message: "No new leads today yet." };
        const list = leads.map((l) => `• ${l.clientName} (${l.code}) — ${l.city ?? "?"} via ${l.source}`).join("\n");
        return { ok: true, message: `📋 **${leads.length} lead(s) today:**\n${list}`, link: "/leads" };
      }

      case "upcoming_events": {
        const bookings = await db.booking.findMany({
          where: { status: { in: ["CONFIRMED", "IN_PROGRESS"] }, eventDate: { gte: startToday } },
          select: { code: true, clientName: true, city: true, eventDate: true, basePrice: true },
          orderBy: { eventDate: "asc" },
          take: 5,
        });
        if (bookings.length === 0) return { ok: true, message: "No upcoming confirmed events." };
        const list = bookings.map((b) => `• ${b.clientName} (${b.code}) — ${new Date(b.eventDate).toLocaleDateString("en-IN")} in ${b.city ?? "?"}`).join("\n");
        return { ok: true, message: `📅 **Next ${bookings.length} upcoming events:**\n${list}`, link: "/bookings" };
      }

      case "overdue_collections": {
        const bookings = await db.booking.findMany({
          where: {
            status: { in: ["CONFIRMED", "COMPLETED"] },
            sheetBalanceDue: { gt: 0 },
            eventDate: { lt: startToday },
          },
          select: { code: true, clientName: true, sheetBalanceDue: true, eventDate: true },
          orderBy: { eventDate: "asc" },
          take: 5,
        });
        if (bookings.length === 0) return { ok: true, message: "No overdue collections! 🎉" };
        const list = bookings.map((b) => `• ${b.clientName} (${b.code}) — ₹${(b.sheetBalanceDue ?? 0).toLocaleString("en-IN")} overdue`).join("\n");
        return { ok: true, message: `⚠️ **${bookings.length} overdue collection(s):**\n${list}`, link: "/collections/overdue" };
      }

      case "recent_bookings": {
        const bookings = await db.booking.findMany({
          where: { status: { not: "CANCELLED" } },
          select: { code: true, clientName: true, city: true, eventDate: true, status: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        });
        const list = bookings.map((b) => `• ${b.clientName} (${b.code}) — ${b.status}`).join("\n");
        return { ok: true, message: `📂 **Last 5 bookings:**\n${list}`, link: "/bookings" };
      }

      case "total_stats": {
        const [bookingCount, leadCount, confirmedCount] = await Promise.all([
          db.booking.count({ where: { status: { not: "CANCELLED" } } }),
          db.lead.count(),
          db.booking.count({ where: { status: "CONFIRMED", eventDate: { gte: startToday } } }),
        ]);
        return {
          ok: true,
          message: `📊 **Quick Stats:**\n• Total bookings: ${bookingCount}\n• Total leads: ${leadCount}\n• Upcoming confirmed: ${confirmedCount}`,
        };
      }

      default:
        return { ok: false, error: "Unknown query type" };
    }
  } catch (e) {
    return { ok: false, error: `Query failed: ${e instanceof Error ? e.message : "unknown error"}` };
  }
}
