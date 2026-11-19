import { describe, it, expect } from "vitest";
import { nameKey, splitName } from "./name";

describe("nameKey", () => {
  it("lowercases and trims", () => {
    expect(nameKey("Rahul Sharma")).toBe("rahul sharma");
  });

  it("strips 'ji' honorific", () => {
    expect(nameKey("Snigdha ji")).toBe("snigdha");
  });

  it("strips 'jii' honorific", () => {
    expect(nameKey("Snigdha jii")).toBe("snigdha");
  });

  it("produces same key for variants", () => {
    expect(nameKey("Snigdha jii")).toBe(nameKey("snigdha ji"));
    expect(nameKey("Snigdha jii")).toBe(nameKey("Snigdha"));
  });

  it("strips 'sir'", () => {
    expect(nameKey("Ramesh sir")).toBe("ramesh");
  });

  it("strips 'ma'am'", () => {
    expect(nameKey("Priya ma'am")).toBe("priya");
  });

  it("strips punctuation", () => {
    expect(nameKey("Rahul-Sharma!")).toBe("rahul sharma");
  });

  it("collapses multiple spaces", () => {
    expect(nameKey("  Rahul   Sharma  ")).toBe("rahul sharma");
  });

  it("returns empty string for empty input", () => {
    expect(nameKey("")).toBe("");
  });
});

describe("splitName", () => {
  it("splits first and last", () => {
    expect(splitName("Rahul Sharma")).toEqual({ first: "Rahul", last: "Sharma" });
  });

  it("handles single name", () => {
    expect(splitName("Rahul")).toEqual({ first: "Rahul", last: "" });
  });

  it("strips honorifics before splitting", () => {
    expect(splitName("Snigdha jii")).toEqual({ first: "Snigdha", last: "" });
  });
});
