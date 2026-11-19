import { describe, expect, it } from "vitest";
import { assertCommitTarget, targetFingerprint, targetFromUrl } from "./target";
const target = targetFromUrl("postgresql://user:password@example.test:5432/junabooth?schema=import_scratch");
describe("import target guard", () => {
  it("uses host, database, and schema", () => expect(targetFingerprint(target)).not.toBe(targetFingerprint({ ...target, schema: "public" })));
  it("refuses a wrong confirmation", () => expect(() => assertCommitTarget(target, "wrong", false)).toThrow("IMPORT_TARGET_CONFIRM"));
  it("refuses public without explicit flag", () => expect(() => assertCommitTarget({ ...target, schema: "public" }, targetFingerprint({ ...target, schema: "public" }), false)).toThrow("public"));
  it("accepts an exact non-public target", () => expect(() => assertCommitTarget(target, targetFingerprint(target), false)).not.toThrow());
});
