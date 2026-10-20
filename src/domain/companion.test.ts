import { describe, expect, it } from "vitest";
import {
  collectFieldErrors,
  companionFormSchema,
  parseExamples,
  serializeExamples,
  slugify,
} from "@/domain/companion";

const validInput = {
  name: "Aria Vale",
  tagline: "Late-night radio host who remembers the songs you needed.",
  description:
    "Aria runs a tiny radio show from a converted garage. She is warm, wry, and allergic to platitudes.",
  categoryId: "6f1f6f5e-3a4b-4c8d-9e2f-1a2b3c4d5e6f",
  imageUrl: "https://example.com/aria.jpg",
  greeting: "You caught me between tracks. What is keeping you up?",
  instructions:
    "Speak like a radio host in a quiet room. Ask one good follow-up question at a time.",
  examples: [{ user: "I am tired.", assistant: "Tired has a lot of disguises." }],
  visibility: "public" as const,
};

describe("slugify", () => {
  it("turns a display name into a url slug", () => {
    expect(slugify("Aria Vale")).toBe("aria-vale");
  });

  it("strips diacritics and punctuation", () => {
    expect(slugify("  Thalia Vey — Storm Witch! ")).toBe("thalia-vey-storm-witch");
  });

  it("caps the slug at 60 characters", () => {
    expect(slugify("a".repeat(80))).toHaveLength(60);
  });
});

describe("parseExamples", () => {
  it("reads one exchange per line", () => {
    expect(
      parseExamples("I am tired. | Tired has disguises.\nI am stuck. | Stuck is a location."),
    ).toEqual([
      { user: "I am tired.", assistant: "Tired has disguises." },
      { user: "I am stuck.", assistant: "Stuck is a location." },
    ]);
  });

  it("drops lines without a separator or with an empty side", () => {
    expect(parseExamples("no separator\nonly user |\n| only assistant")).toEqual([]);
  });

  it("keeps at most four exchanges", () => {
    const raw = ["a | 1", "b | 2", "c | 3", "d | 4", "e | 5"].join("\n");
    expect(parseExamples(raw)).toHaveLength(4);
  });

  it("round-trips through serializeExamples", () => {
    const examples = [{ user: "I am tired.", assistant: "Tired has disguises." }];
    expect(parseExamples(serializeExamples(examples))).toEqual(examples);
  });
});

describe("companionFormSchema", () => {
  it("accepts a complete companion", () => {
    expect(companionFormSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects a non-https image url", () => {
    const result = companionFormSchema.safeParse({
      ...validInput,
      imageUrl: "ftp://example.com/a",
    });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("expected the image url to fail");
    expect(collectFieldErrors(result.error).imageUrl?.[0]).toBe(
      "Image URL must use http or https.",
    );
  });

  it("rejects a category that is not a uuid", () => {
    const result = companionFormSchema.safeParse({ ...validInput, categoryId: "everyday" });
    expect(result.success).toBe(false);
  });

  it("rejects instructions shorter than thirty characters", () => {
    const result = companionFormSchema.safeParse({ ...validInput, instructions: "Be nice." });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("expected the instructions to fail");
    expect(collectFieldErrors(result.error).instructions).toContain(
      "Give the companion at least 30 characters of direction.",
    );
  });

  it("rejects more than four examples", () => {
    const result = companionFormSchema.safeParse({
      ...validInput,
      examples: Array.from({ length: 5 }, () => ({ user: "a", assistant: "b" })),
    });
    expect(result.success).toBe(false);
  });
});
