import { describe, expect, it } from "bun:test";
import { factText, parseCompareIds } from "./discovery";
import { atlasModules } from "./modules";

describe("Discovery trust rules", () => {
  it("keeps missing tuition unknown instead of free", () => { expect(factText(undefined)).toBe("Not verified"); expect(factText({ value: null })).not.toBe("0"); });
  it("does not turn missing requirements into a waiver", () => { expect(factText({ value: null })).toBe("Not verified"); });
  it("requires official reviewed evidence to claim not published", () => {
    expect(factText({ value: null, missing_reason: "not_published" })).toBe("Not verified");
    expect(factText({ value: null, missing_reason: "not_published", verification: "reviewed_official", source_type: "official", source_url: "https://institution.edu/program", checked_at: "2026-10-20" })).toBe("Not published");
  });
  it("preserves a published zero instead of losing it", () => { expect(factText({ value: 0 })).toBe("0"); });
  it("ignores invalid comparison IDs", () => { expect(parseCompareIds("junk")).toEqual([]); });
});
it("matches the exact discovery-first 13-module order", () => {
  expect(atlasModules.map((m) => m.slug)).toEqual(["profile", "universities", "undergrad", "masters", "phd", "sop", "cv", "scholarships", "research", "documents", "applications", "roadmap", "intelligence"]);
  expect(atlasModules[1].to).toBe("/programs"); expect(atlasModules[11].to).toBe("/roadmap");
});