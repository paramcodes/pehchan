import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import {
  appendMessage,
  getConversationForUser,
  getOrCreateConversation,
  listMessages,
  retrieveMemories,
  updateConversationTitle,
} from "@/db/chat";
import { createCompanion } from "@/db/companions";
import { categories, memories, user } from "@/db/schema";
import type { CompanionFormInput } from "@/domain/companion";
import { closeDatabase } from "@/test/integration-db";

const { EMBEDDING } = vi.hoisted(() => ({
  EMBEDDING: Array.from({ length: 1536 }, (_, index) => ((index % 7) + 1) / 7),
}));

vi.mock("@/lib/ai", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...(actual as object), embedText: vi.fn(async () => EMBEDDING) };
});

const suffix = randomUUID().slice(0, 8);
const ownerId = `auth-owner-${suffix}`;
const strangerId = `auth-stranger-${suffix}`;
const categoryId = randomUUID();

const companionInput: CompanionFormInput = {
  name: `Authorization Companion ${suffix}`,
  tagline: "Exists so a second account can try to read it.",
  description:
    "A companion created by the authorization integration test. It gives the stranger account a real row to aim at.",
  categoryId,
  imageUrl: "https://example.com/authorization-companion.jpg",
  greeting: "Try to read this. You will not.",
  instructions: "Answer in one short sentence. Confirm only what the owner is allowed to know.",
  examples: [{ user: "Who owns this?", assistant: "Only the account that started it." }],
  visibility: "public",
};

let conversationId = "";
let companionId = "";

beforeAll(async () => {
  await db.insert(categories).values({
    id: categoryId,
    slug: `auth-category-${suffix}`,
    name: "Authorization Category",
    description: "Created by the authorization integration test.",
    sortOrder: 98,
  });

  await db.insert(user).values([
    {
      id: ownerId,
      name: "Authorization Owner",
      email: `auth-owner-${suffix}@example.com`,
      emailVerified: true,
    },
    {
      id: strangerId,
      name: "Authorization Stranger",
      email: `auth-stranger-${suffix}@example.com`,
      emailVerified: true,
    },
  ]);

  const companion = await createCompanion(ownerId, companionInput);
  if (!companion) throw new Error("companion was not created");
  companionId = companion.id;

  const conversation = await getOrCreateConversation({
    userId: ownerId,
    companionId: companion.id,
    companionName: companionInput.name,
    viewerId: ownerId,
  });
  if (!conversation) throw new Error("conversation was not created");
  conversationId = conversation.id;

  await appendMessage({
    conversationId,
    userId: ownerId,
    role: "user",
    content: "Is this stored?",
  });
  await appendMessage({
    conversationId,
    userId: ownerId,
    role: "assistant",
    content: "Every message is.",
  });

  await db.insert(memories).values({
    userId: ownerId,
    companionId: companion.id,
    conversationId,
    content: "The owner takes their coffee black.",
    embedding: EMBEDDING,
    importance: 0.9,
  });
});

afterAll(async () => {
  await db.delete(user).where(eq(user.id, ownerId));
  await db.delete(user).where(eq(user.id, strangerId));
  await db.delete(categories).where(eq(categories.id, categoryId));
  await closeDatabase();
});

describe("cross-user isolation", () => {
  it("reads the owner's messages for the owner", async () => {
    const messages = await listMessages(conversationId, ownerId);
    expect(messages.map((message) => message.content)).toEqual([
      "Is this stored?",
      "Every message is.",
    ]);
  });

  it("refuses to read another user's messages", async () => {
    const messages = await listMessages(conversationId, strangerId);
    expect(messages).toEqual([]);
  });

  it("refuses to append to another user's conversation", async () => {
    const appended = await appendMessage({
      conversationId,
      userId: strangerId,
      role: "user",
      content: "Let me in.",
    });

    expect(appended).toBeNull();
    expect((await listMessages(conversationId, ownerId)).map((message) => message.content)).toEqual(
      ["Is this stored?", "Every message is."],
    );
  });

  it("refuses to rename another user's conversation", async () => {
    await updateConversationTitle(conversationId, strangerId, "Renamed by a stranger");

    const conversation = await getConversationForUser(conversationId, ownerId);
    expect(conversation?.title).toBe(`Chat with ${companionInput.name}`);
  });

  it("returns the owner's memories to the owner", async () => {
    const retrieved = await retrieveMemories({
      userId: ownerId,
      companionId,
      query: "coffee",
    });

    expect(retrieved.map((memory) => memory.content)).toEqual([
      "The owner takes their coffee black.",
    ]);
  });

  it("refuses to read another user's memories", async () => {
    const retrieved = await retrieveMemories({
      userId: strangerId,
      companionId,
      query: "coffee",
    });

    expect(retrieved).toEqual([]);
  });
});
