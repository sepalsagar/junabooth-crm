"use server";

// src/features/ai-agent/agent-actions.ts
// Server actions that execute the AI tool calls against the real DB with extreme input hardening

import { requireRole } from "@/lib/auth-guards";
import { createLead } from "@/features/leads/actions";
import { createExpense } from "@/features/expenses/actions";
import { db } from "@/lib/db";
import { nextCode } from "@/lib/codes";
import { startOfTodayIST } from "@/lib/dates";
import { inr } from "@/lib/format";
import { currentISTMonth, parseMonth } from "@/features/metrics/filters";
import { getFirmCapitalSummary } from "@/features/capital/queries";
import { getCashPosition, getMonthlyPLData } from "@/features/metrics/queries";

export type AgentToolResult =
  | { ok: true; message: string; link?: string }
  | { ok: false; error: string };

const VALID_EXPENSE_CATEGORIES = new Set([
  "OPERATOR_FEE",
  "TRANSPORT",
  "FOOD",
  "VENUE_CUT",
  "CONSUMABLES",
  "EQUIPMENT",
  "SOFTWARE",
  "CARPENTRY",
  "EMI",
  "MARKETING",
  "ADMIN",
  "OTHER",
]);

function sanitizePhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  // Remove leading country code 91 or 0 if present
  const cleaned = digits.replace(/^(91|0)/, "");
  if (cleaned.length >= 10) {
    return cleaned.slice(-10);
  }
  return null;
}

function safeDate(raw: string | undefined, fallback?: Date): Date | undefined {
  if (!raw) return fallback;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return fallback;
  return d;
}

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
    const rawName = (args.clientName || "").trim();
    if (!rawName) {
      return { ok: false, error: "Please provide a client name for the lead." };
    }
    const clientName = rawName.slice(0, 100);

    const phone = sanitizePhone(args.phone);
    if (!phone) {
      return {
        ok: false,
        error: `"${args.phone || ""}" is not a valid 10-digit Indian phone number. Please provide a 10-digit mobile number.`,
      };
    }

    const city = (args.city || "").trim().slice(0, 80);
    const notes = (args.notes || "").trim().slice(0, 1000);
    const targetDate = safeDate(args.targetDate);

    const result = await createLead({
      clientName,
      phone,
      city: city || undefined,
      source: args.source || "OTHER",
      notes: notes || undefined,
      targetDate,
    });

    if (!result.ok) return { ok: false, error: result.error };

    const warning = result.duplicateWarning ? ` ⚠️ ${result.duplicateWarning}` : "";
    return {
      ok: true,
      message: `✅ Lead created: **${clientName}** (${result.data.code}) from ${city || "unspecified region"}.${warning}`,
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

    const rawName = (args.clientName || "").trim();
    if (!rawName) {
      return { ok: false, error: "Please provide a client name for the booking." };
    }
    const clientName = rawName.slice(0, 100);

    const phone = sanitizePhone(args.phone);
    if (!phone) {
      return {
        ok: false,
        error: `"${args.phone || ""}" is not a valid 10-digit Indian phone number. Please provide a 10-digit mobile number.`,
      };
    }

    const eventDate = safeDate(args.eventDate);
    if (!eventDate) {
      return {
        ok: false,
        error: `"${args.eventDate || ""}" is not a recognized date. Please provide a valid date format like YYYY-MM-DD.`,
      };
    }

    const numPrice = Number(args.basePrice);
    if (isNaN(numPrice) || numPrice <= 0) {
      return {
        ok: false,
        error: "Please specify a valid positive package or booking fee in rupees.",
      };
    }
    const basePrice = Math.round(numPrice);

    let advance = 0;
    if (args.advance !== undefined && args.advance !== null) {
      const numAdv = Number(args.advance);
      if (!isNaN(numAdv) && numAdv > 0) {
        advance = Math.round(numAdv);
      }
    }

    const city = (args.city || "").trim().slice(0, 80) || null;
    const venue = (args.venue || "").trim().slice(0, 150) || null;
    const notes = (args.notes || "").trim().slice(0, 1000) || null;

    const booking = await db.$transaction(async (tx) => {
      const code = await nextCode("JB", tx);
      return await tx.booking.create({
        data: {
          code,
          clientName,
          phone,
          city,
          venue,
          eventDate,
          startTime: (args.startTime || "").trim().slice(0, 20) || null,
          endTime: (args.endTime || "").trim().slice(0, 20) || null,
          basePrice,
          travelCharge: 0,
          discount: 0,
          packageName: "Custom",
          status: "CONFIRMED",
          notes,
          activities: {
            create: {
              type: "CREATED",
              message: `Booking created via AI Agent for ${clientName} on ${eventDate.toISOString().slice(0, 10)}`,
            },
          },
        },
      });
    });

    // Record advance payment if provided
    if (advance > 0) {
      await db.payment.create({
        data: {
          bookingId: booking.id,
          amount: advance,
          kind: "ADVANCE",
          mode: "UPI",
          paidOn: new Date(),
        },
      });
    }

    const formattedDate = eventDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
    const advNote = advance > 0 ? ` Advance of ${inr(advance)} recorded.` : "";

    return {
      ok: true,
      message: `✅ Booking created: **${clientName}** (${booking.code}) on ${formattedDate} for ${inr(basePrice)}.${advNote}`,
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
    const numAmount = Number(args.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { ok: false, error: "Please enter a valid positive expense amount in rupees." };
    }
    const amount = Math.round(numAmount);

    let category = (args.category || "OTHER").toUpperCase().trim();
    if (!VALID_EXPENSE_CATEGORIES.has(category)) {
      category = "OTHER";
    }

    const spentOn = safeDate(args.spentOn, new Date())!;
    const paidBy = (args.paidBy || "").trim().slice(0, 80) || undefined;
    const note = (args.note || "").trim().slice(0, 500) || undefined;

    const result = await createExpense({
      category: category as any,
      amount,
      spentOn,
      paidBy,
      note,
    });

    if (!result.ok) return { ok: false, error: result.error };

    const formattedDate = spentOn.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
    return {
      ok: true,
      message: `✅ Expense recorded: ${inr(amount)} for **${category.replace(/_/g, " ")}** on ${formattedDate}.`,
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

    const qType = (args.queryType || "").toLowerCase().trim();

    switch (qType) {
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
        return {
          ok: false,
          error: `Unrecognized query type: "${args.queryType}". You can ask about monthly expenses, partner financials, upcoming bookings, leads, or overall stats.`,
        };
    }
  } catch (e) {
    return { ok: false, error: `Query failed: ${e instanceof Error ? e.message : "unknown error"}` };
  }
}
