import { describe, expect, it } from "vitest";
import { createLeadSchema, leadFiltersSchema } from "./schema";

describe("Lead Schemas", () => {
  describe("leadFiltersSchema", () => {
    it("handles safe defaults and garbage inputs gracefully", () => {
      const parsed = leadFiltersSchema.parse({
        page: "invalid_page",
        minAmt: "not_a_number",
        status: "INVALID_STATUS",
        followUp: "garbage",
        from: "invalid-date",
      });

      expect(parsed.page).toBe(1);
      expect(parsed.minAmt).toBeUndefined();
      expect(parsed.status).toEqual([]);
      expect(parsed.followUp).toBeUndefined();
      expect(parsed.from).toBeUndefined();
    });

    it("parses valid comma-separated or array statuses and sources", () => {
      const parsed = leadFiltersSchema.parse({
        status: "NEW,CONTACTED",
        source: ["INSTAGRAM", "META_AD"],
        page: "3",
        minAmt: "15000",
        maxAmt: "50000",
        q: "  Aarav  ",
        followUp: "overdue",
      });

      expect(parsed.status).toEqual(["NEW", "CONTACTED"]);
      expect(parsed.source).toEqual(["INSTAGRAM", "META_AD"]);
      expect(parsed.page).toBe(3);
      expect(parsed.minAmt).toBe(15000);
      expect(parsed.maxAmt).toBe(50000);
      expect(parsed.q).toBe("Aarav");
      expect(parsed.followUp).toBe("overdue");
    });
  });

  describe("createLeadSchema", () => {
    it("validates clientName and phone number", () => {
      const valid = createLeadSchema.safeParse({
        clientName: "Rahul Sharma",
        phone: "+91 98765-43210",
        city: "Patna",
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.phone).toBe("9876543210");
      }

      const invalidPhone = createLeadSchema.safeParse({
        clientName: "Rahul",
        phone: "12345",
      });
      expect(invalidPhone.success).toBe(false);

      const emptyName = createLeadSchema.safeParse({
        clientName: "   ",
        phone: "9876543210",
      });
      expect(emptyName.success).toBe(false);
    });
  });
});
