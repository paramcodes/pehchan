import { createOpenAI } from "@ai-sdk/openai";
import { embed, generateObject, generateText } from "ai";
import { z } from "zod";
import { EMBEDDING_DIMENSIONS } from "@/db/schema";
import { getAiConfig, isMockAi } from "@/lib/env";

let provider: ReturnType<typeof createOpenAI> | null = null;

function getProvider() {
  const config = getAiConfig();

  if (!config.apiKey) {
    throw new Error("AI_API_KEY is missing. Set AI_MODE=mock or provide a key.");
  }

  provider ??= createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl || undefined,
  });

  return provider;
}

export function getChatModel() {
  const config = getAiConfig();
  return getProvider().chat(config.chatModel);
}

export function getEmbeddingModel() {
  const config = getAiConfig();
  return getProvider().embedding(config.embeddingModel);
}

export async function embedText(text: string): Promise<number[] | null> {
  if (isMockAi()) return null;

  try {
    const { embedding } = await embed({
      model: getEmbeddingModel(),
      value: text,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return embedding;
  } catch (error) {
    console.error("Embedding request failed.", error);
    return null;
  }
}

const extractedMemorySchema = z.object({
  memories: z
    .array(
      z.object({
        content: z.string().min(5).max(400),
        importance: z.number().min(0).max(1),
      }),
    )
    .max(5),
});

export type ExtractedMemory = z.infer<typeof extractedMemorySchema>["memories"][number];

export async function extractMemories(input: {
  companionName: string;
  userName: string;
  transcript: string;
}): Promise<ExtractedMemory[]> {
  if (isMockAi()) return [];

  try {
    const { object } = await generateObject({
      model: getChatModel(),
      schema: extractedMemorySchema,
      prompt: [
        `Extract durable memories from this conversation between ${input.userName} and ${input.companionName}.`,
        "Keep only facts that would improve a future conversation: preferences, relationships, ongoing situations, promises, and important events.",
        "Do not store small talk, assistant inventions, sensitive credentials, or medical diagnoses.",
        "Return an empty list when nothing is worth remembering.",
        "",
        input.transcript.slice(0, 12_000),
      ].join("\n"),
    });

    return object.memories;
  } catch (error) {
    console.error("Memory extraction failed.", error);
    return [];
  }
}

export async function generateTitle(input: {
  companionName: string;
  firstMessage: string;
}): Promise<string> {
  if (isMockAi()) {
    return `Chat with ${input.companionName}`;
  }

  try {
    const { text } = await generateText({
      model: getChatModel(),
      prompt: `Write a 3 to 5 word title for a conversation that starts with: "${input.firstMessage.slice(0, 300)}". Return only the title, no quotes.`,
    });

    return text.trim().slice(0, 60) || `Chat with ${input.companionName}`;
  } catch {
    return `Chat with ${input.companionName}`;
  }
}
