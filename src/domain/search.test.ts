import { describe, expect, it } from "vitest";
import { normalizeSearchQuery, toTsQuery } from "@/domain/search";

describe("normalizeSearchQuery", () => {
  it("returns an empty string for missing input", () => {
    expect(normalizeSearchQuery(undefined)).toBe("");
  });

  it("collapses whitespace and control characters", () => {
    expect(normalizeSearchQuery("  late\u0000night   radio  ")).toBe("late night radio");
  });

  it("caps the query at eighty characters", () => {
    expect(normalizeSearchQuery("a".repeat(120))).toHaveLength(80);
  });
});

describe("toTsQuery", () => {
  it("joins terms with AND", () => {
    expect(toTsQuery("late night")).toBe("late & night");
  });

  it("removes characters that break a tsquery", () => {
    expect(toTsQuery("who? (remembers) songs!")).toBe("who & remembers & songs");
  });

  it("keeps hyphens and apostrophes inside words", () => {
    expect(toTsQuery("late-night don't")).toBe("late-night & don't");
  });

  it("returns an empty string when nothing usable remains", () => {
    expect(toTsQuery("???")).toBe("");
  });
});
