import { startOfTodayIST } from "@/lib/dates";
import { LOST_REASONS, type LeadStatusType, type LostReasonType } from "./schema";

export type StatusChangeValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateStatusChange(
  next: LeadStatusType,
  data: {
    nextFollowUp?: Date | null;
    lostReason?: string | null;
  },
  now: Date = new Date()
): StatusChangeValidationResult {
  // Direct transition to WON is disabled in leads module; booking creation handles it
  if (next === "WON") {
    return {
      valid: false,
      error: "Convert to a booking (Phase 4)",
    };
  }

  // Active pipelines require a non-past nextFollowUp
  if (["CONTACTED", "QUOTED", "FOLLOW_UP", "POSTPONED"].includes(next)) {
    if (!data.nextFollowUp) {
      return {
        valid: false,
        error: `Next follow-up date is required when status is ${next}`,
      };
    }

    // Must be today or future in IST
    const startOfToday = startOfTodayIST(now);
    if (data.nextFollowUp < startOfToday) {
      return {
        valid: false,
        error: "Next follow-up date cannot be in the past",
      };
    }
  }

  // LOST requires a valid lostReason
  if (next === "LOST") {
    if (
      !data.lostReason ||
      !LOST_REASONS.includes(data.lostReason.trim() as LostReasonType)
    ) {
      return {
        valid: false,
        error: `A valid lost reason is required (${LOST_REASONS.join(", ")})`,
      };
    }
  }

  return { valid: true };
}
