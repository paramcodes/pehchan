export type EmbeddedMemory = {
  content: string;
  embedding: number[];
  importance: number;
};

export function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  if (left.length === 0 || left.length !== right.length) return 0;

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }

  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function normalizeContent(content: string): string {
  return content.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isDuplicateMemory(
  candidate: EmbeddedMemory,
  existing: readonly EmbeddedMemory[],
  threshold = 0.92,
): boolean {
  const normalized = normalizeContent(candidate.content);

  return existing.some((memory) => {
    if (normalizeContent(memory.content) === normalized) return true;
    return cosineSimilarity(candidate.embedding, memory.embedding) >= threshold;
  });
}

export function selectNovelMemories(
  candidates: readonly EmbeddedMemory[],
  existing: readonly EmbeddedMemory[],
  threshold = 0.92,
): EmbeddedMemory[] {
  const accepted: EmbeddedMemory[] = [];

  for (const candidate of candidates) {
    if (candidate.content.trim().length === 0) continue;
    if (isDuplicateMemory(candidate, [...existing, ...accepted], threshold)) continue;
    accepted.push(candidate);
  }

  return accepted;
}

export function memoryScore(input: {
  similarity: number;
  importance: number;
  ageInDays: number;
}): number {
  const recency = 1 / (1 + Math.max(0, input.ageInDays) / 30);
  return input.similarity * 0.65 + input.importance * 0.2 + recency * 0.15;
}
