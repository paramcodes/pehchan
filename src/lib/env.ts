export function isMockAi(): boolean {
  return process.env.AI_MODE !== "live";
}

export function getAiConfig() {
  return {
    apiKey: process.env.AI_API_KEY,
    baseUrl: process.env.AI_BASE_URL,
    chatModel: process.env.AI_CHAT_MODEL ?? "gpt-4.1-mini",
    embeddingModel: process.env.AI_EMBEDDING_MODEL ?? "text-embedding-3-small",
  };
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
