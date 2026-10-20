import { describe, expect, it } from "vitest";
import {
  cosineSimilarity,
  isDuplicateMemory,
  memoryScore,
  selectNovelMemories,
  type EmbeddedMemory,
} from "@/domain/memory";

function memory(content: string, embedding: number[], importance = 0.5): EmbeddedMemory {
  return { content, embedding, importance };
}

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it("returns 0 for a zero vector or a length mismatch", () => {
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });
});

describe("isDuplicateMemory", () => {
  const existing = [memory("Lives in Pune", [1, 0, 0])];

  it("matches identical text ignoring case and spacing", () => {
    expect(isDuplicateMemory(memory("  lives   in PUNE ", [0, 1, 0]), existing)).toBe(true);
  });

  it("matches a near-identical embedding above the threshold", () => {
    expect(isDuplicateMemory(memory("Another phrasing", [0.99, 0.01, 0]), existing)).toBe(true);
  });

  it("keeps a distinct memory", () => {
    expect(isDuplicateMemory(memory("Works nights", [0, 1, 0]), existing)).toBe(false);
  });
});

describe("selectNovelMemories", () => {
  it("drops duplicates inside the candidate batch", () => {
    const candidates = [
      memory("Has a cat named Miso", [1, 0]),
      memory("has a cat named miso", [1, 0]),
      memory("Runs at dawn", [0, 1]),
    ];

    expect(selectNovelMemories(candidates, []).map((item) => item.content)).toEqual([
      "Has a cat named Miso",
      "Runs at dawn",
    ]);
  });

  it("drops empty content", () => {
    expect(selectNovelMemories([memory("   ", [1, 0])], [])).toEqual([]);
  });

  it("keeps everything when nothing is stored yet", () => {
    const candidates = [memory("a", [1, 0]), memory("b", [0, 1])];
    expect(selectNovelMemories(candidates, [])).toHaveLength(2);
  });
});

describe("memoryScore", () => {
  const base = { similarity: 0.8, importance: 0.5, ageInDays: 0 };

  it("rises with similarity", () => {
    expect(memoryScore({ ...base, similarity: 0.9 })).toBeGreaterThan(memoryScore(base));
  });

  it("falls as a memory ages", () => {
    expect(memoryScore({ ...base, ageInDays: 365 })).toBeLessThan(memoryScore(base));
  });

  it("weights similarity above importance", () => {
    const relevant = memoryScore({ similarity: 0.9, importance: 0, ageInDays: 0 });
    const important = memoryScore({ similarity: 0.1, importance: 1, ageInDays: 0 });
    expect(relevant).toBeGreaterThan(important);
  });
});
