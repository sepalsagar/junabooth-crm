import { describe, expect, it } from "vitest";
import {
  isValidIndianMobile,
  normalizePhone,
  telLink,
  whatsappLink,
} from "./phone";

describe("phone utilities", () => {
  it("normalizes phone numbers with various formats to 10 digits", () => {
    expect(normalizePhone("+91 98765-43210")).toBe("9876543210");
    expect(normalizePhone("09876543210")).toBe("9876543210");
    expect(normalizePhone("+919876543210")).toBe("9876543210");
    expect(normalizePhone("919876543210")).toBe("9876543210");
    expect(normalizePhone(" 98765 43210 ")).toBe("9876543210");
    expect(normalizePhone("(+91) 98765 43210")).toBe("9876543210");
    expect(normalizePhone("009876543210")).toBe("9876543210");
  });

  it("validates Indian mobile numbers correctly", () => {
    expect(isValidIndianMobile("9876543210")).toBe(true);
    expect(isValidIndianMobile("+91 98765-43210")).toBe(true);
    expect(isValidIndianMobile("8123456789")).toBe(true);
    expect(isValidIndianMobile("7000000000")).toBe(true);
    expect(isValidIndianMobile("6999999999")).toBe(true);

    // Invalid formats
    expect(isValidIndianMobile("5123456789")).toBe(false); // starts with 5
    expect(isValidIndianMobile("987654321")).toBe(false); // 9 digits
    expect(isValidIndianMobile("98765432100")).toBe(false); // 11 digits
    expect(isValidIndianMobile("abcdefghij")).toBe(false);
    expect(isValidIndianMobile("")).toBe(false);
  });

  it("generates correct whatsappLink and telLink", () => {
    expect(whatsappLink("+91 98765-43210")).toBe("https://wa.me/919876543210");
    expect(whatsappLink("9876543210", "Hello there!")).toBe(
      "https://wa.me/919876543210?text=Hello%20there!"
    );
    expect(telLink("+91 98765-43210")).toBe("tel:+919876543210");
  });
});
