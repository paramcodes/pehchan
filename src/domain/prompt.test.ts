import { describe, expect, it } from "vitest";
import { buildCompanionPrompt, formatExamples } from "@/domain/prompt";

const companion = {
  name: "Aria Vale",
  tagline: "Late-night radio host.",
  description: "Runs a tiny radio show from a converted garage.",
  instructions: "Speak low and precise. Ask one follow-up question.",
  examples: [
    { user: "I keep replaying a conversation.", assistant: "The line you keep landing on?" },
  ],
};

describe("formatExamples", () => {
  it("labels each side with the companion name", () => {
    expect(formatExamples("Aria Vale", companion.examples)).toBe(
      "User: I keep replaying a conversation.\nAria Vale: The line you keep landing on?",
    );
  });

  it("states when there is no example dialogue", () => {
    expect(formatExamples("Aria Vale", [])).toBe("No example dialogue provided.");
  });
});

describe("buildCompanionPrompt", () => {
  const prompt = buildCompanionPrompt({
    companion,
    userName: "Sam",
    memories: [
      { content: "Works nights", importance: 0.4 },
      { content: "Has a cat named Miso", importance: 0.9 },
    ],
  });

  it("includes the character and its voice", () => {
    expect(prompt).toContain("You are Aria Vale.");
    expect(prompt).toContain(companion.description);
    expect(prompt).toContain(companion.instructions);
  });

  it("includes example dialogue", () => {
    expect(prompt).toContain("User: I keep replaying a conversation.");
  });

  it("ranks memories by importance", () => {
    expect(prompt.indexOf("Has a cat named Miso")).toBeLessThan(prompt.indexOf("Works nights"));
  });

  it("addresses the user by name", () => {
    expect(prompt).toContain("What you remember about Sam:");
  });

  it("says when there are no memories", () => {
    const empty = buildCompanionPrompt({ companion, userName: "Sam", memories: [] });
    expect(empty).toContain("You do not have any stored memories about Sam yet.");
  });

  it("caps the memory block at eight entries", () => {
    const memories = Array.from({ length: 12 }, (_, index) => ({
      content: `memory-${index}`,
      importance: index,
    }));
    const capped = buildCompanionPrompt({ companion, userName: "Sam", memories });
    expect(capped).toContain("memory-11");
    expect(capped).not.toContain("memory-3");
  });

  it("carries the safety rules", () => {
    expect(prompt).toContain("You are a fictional companion, not a licensed professional.");
    expect(prompt).toContain("Never invent memories about the user.");
  });
});
