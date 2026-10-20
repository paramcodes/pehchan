import type { CompanionExample } from "@/db/schema";

export type CompanionPromptSource = {
  name: string;
  tagline: string;
  description: string;
  instructions: string;
  examples: CompanionExample[];
};

export type PromptMemory = {
  content: string;
  importance: number;
};

const BASE_RULES = [
  "Stay in character. You are a fictional companion, not a licensed professional.",
  "Never invent memories about the user. Use only the memories listed below.",
  "Keep replies conversational, specific, and free of corporate filler.",
  "Do not produce sexual content, hateful content, or instructions for harming anyone.",
  "If the user is in crisis, encourage them to contact local emergency services or a trusted person.",
];

export function formatExamples(name: string, examples: CompanionExample[]): string {
  if (examples.length === 0) return "No example dialogue provided.";

  return examples
    .map((example) => `User: ${example.user}\n${name}: ${example.assistant}`)
    .join("\n\n");
}

export function buildCompanionPrompt(input: {
  companion: CompanionPromptSource;
  memories: PromptMemory[];
  userName: string;
}): string {
  const { companion, memories, userName } = input;
  const rankedMemories = [...memories]
    .sort((left, right) => right.importance - left.importance)
    .slice(0, 8)
    .map((memory) => `- ${memory.content}`);

  const memoryBlock =
    rankedMemories.length > 0
      ? `What you remember about ${userName}:\n${rankedMemories.join("\n")}`
      : `You do not have any stored memories about ${userName} yet.`;

  return [
    `You are ${companion.name}. ${companion.tagline}`,
    `Character description:\n${companion.description}`,
    `Behaviour and voice:\n${companion.instructions}`,
    `Example dialogue:\n${formatExamples(companion.name, companion.examples)}`,
    memoryBlock,
    `Rules:\n${BASE_RULES.map((rule) => `- ${rule}`).join("\n")}`,
  ].join("\n\n");
}
