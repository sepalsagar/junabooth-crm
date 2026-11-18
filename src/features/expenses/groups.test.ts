import { describe, expect, it } from "vitest";
import { CATEGORY_GROUP, categoriesOf } from "./groups";

describe("expense groups", () => {
  it("maps categories and is a single source of truth", () => {
    expect(CATEGORY_GROUP.TRANSPORT).toBe("event-day");
    expect(categoriesOf("setup")).toEqual(["EQUIPMENT", "SOFTWARE", "CARPENTRY", "EMI"]);
  });
});
