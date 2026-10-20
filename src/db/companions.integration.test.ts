import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  appendMessage,
  getConversationForUser,
  getOrCreateConversation,
  listMessages,
  listRecentConversations,
} from "@/db/chat";
import {
  createCompanion,
  deleteCompanion,
  getCompanionBySlug,
  getOwnedCompanion,
  listCompanions,
  listOwnedCompanions,
  updateCompanion,
} from "@/db/companions";
import { categories, user } from "@/db/schema";
import type { CompanionFormInput } from "@/domain/companion";
import { closeDatabase } from "@/test/integration-db";

const suffix = randomUUID().slice(0, 8);
const ownerId = `test-owner-${suffix}`;
const strangerId = `test-stranger-${suffix}`;
const categoryId = randomUUID();

const input: CompanionFormInput = {
  name: `Test Companion ${suffix}`,
  tagline: "A companion that exists only for this test run.",
  description:
    "Written by the integration test so the catalogue queries have a row with known values.",
  categoryId,
  imageUrl: "https://example.com/test-companion.jpg",
  greeting: "The test begins. What should we check first?",
  instructions:
    "Answer in short sentences. Confirm that persistence, ownership, and ordering behave as written.",
  examples: [{ user: "Is this stored?", assistant: "Every message is." }],
  visibility: "public",
};

beforeAll(async () => {
  await db.insert(categories).values({
    id: categoryId,
    slug: `test-category-${suffix}`,
    name: "Test Category",
    description: "Created by the integration test.",
    sortOrder: 99,
  });

  await db.insert(user).values([
    {
      id: ownerId,
      name: "Test Owner",
      email: `owner-${suffix}@example.com`,
      emailVerified: true,
    },
    {
      id: strangerId,
      name: "Test Stranger",
      email: `stranger-${suffix}@example.com`,
      emailVerified: true,
    },
  ]);
});

afterAll(async () => {
  await db.delete(user).where(eq(user.id, ownerId));
  await db.delete(user).where(eq(user.id, strangerId));
  await db.delete(categories).where(eq(categories.id, categoryId));
  await closeDatabase();
});

describe("companion catalogue", () => {
  it("creates a companion and reads it back by slug", async () => {
    const created = await createCompanion(ownerId, input);
    expect(created).toBeDefined();
    if (!created) throw new Error("companion was not created");

    const detail = await getCompanionBySlug(created.slug, ownerId);
    expect(detail?.name).toBe(input.name);
    expect(detail?.tagline).toBe(input.tagline);
    expect(detail?.instructions).toBe(input.instructions);
    expect(detail?.examples).toEqual(input.examples);
    expect(detail?.categoryName).toBe("Test Category");
    expect(detail?.visibility).toBe("public");
  });

  it("finds the companion through catalogue search", async () => {
    const results = await listCompanions({ query: suffix });
    expect(results.map((row) => row.name)).toContain(input.name);
  });

  it("lists owned companions newest first", async () => {
    const owned = await listOwnedCompanions(ownerId);
    expect(owned).toHaveLength(1);
    expect(owned[0]?.name).toBe(input.name);
  });

  it("hides a private companion from strangers but shows it to the owner", async () => {
    const created = await createCompanion(ownerId, {
      ...input,
      name: `Private Companion ${suffix}`,
      visibility: "private",
    });
    if (!created) throw new Error("private companion was not created");

    expect(await getCompanionBySlug(created.slug)).toBeNull();
    expect(await getCompanionBySlug(created.slug, ownerId)).not.toBeNull();
    expect(await getCompanionBySlug(created.slug, strangerId)).toBeNull();
  });

  it("updates only the owner's companion", async () => {
    const created = await createCompanion(ownerId, {
      ...input,
      name: `Editable Companion ${suffix}`,
    });
    if (!created) throw new Error("companion was not created");

    expect(
      await updateCompanion(created.id, strangerId, { ...input, tagline: "Not allowed." }),
    ).toBeNull();

    const updated = await updateCompanion(created.id, ownerId, {
      ...input,
      tagline: "The tagline changed and the row followed.",
    });

    expect(updated?.id).toBe(created.id);
    const detail = await getOwnedCompanion(created.id, ownerId);
    expect(detail?.tagline).toBe("The tagline changed and the row followed.");
  });

  it("deletes only the owner's companion", async () => {
    const created = await createCompanion(ownerId, {
      ...input,
      name: `Deletable Companion ${suffix}`,
    });
    if (!created) throw new Error("companion was not created");

    expect(await deleteCompanion(created.id, strangerId)).toBe(false);
    expect(await deleteCompanion(created.id, ownerId)).toBe(true);
    expect(await getOwnedCompanion(created.id, ownerId)).toBeNull();
  });
});

describe("conversation history", () => {
  it("stores messages in order and scopes the conversation to its owner", async () => {
    const companionName = `Chat Companion ${suffix}`;
    const companion = await createCompanion(ownerId, {
      ...input,
      name: companionName,
    });
    if (!companion) throw new Error("companion was not created");

    const conversation = await getOrCreateConversation({
      userId: ownerId,
      companionId: companion.id,
      companionName: input.name,
      viewerId: ownerId,
    });
    if (!conversation) throw new Error("conversation was not created");

    await appendMessage({
      conversationId: conversation.id,
      userId: ownerId,
      role: "user",
      content: "Is this stored?",
    });
    await appendMessage({
      conversationId: conversation.id,
      userId: ownerId,
      role: "assistant",
      content: "Every message is.",
    });

    const history = await listMessages(conversation.id, ownerId);
    expect(history.map((message) => message.content)).toEqual([
      "Is this stored?",
      "Every message is.",
    ]);

    expect(await getConversationForUser(conversation.id, strangerId)).toBeNull();
    expect((await getConversationForUser(conversation.id, ownerId))?.companionName).toBe(
      companionName,
    );

    const recent = await listRecentConversations(ownerId);
    expect(recent[0]?.id).toBe(conversation.id);
  });

  it("returns the same conversation for the same user and companion", async () => {
    const companion = await createCompanion(ownerId, {
      ...input,
      name: `Reused Chat Companion ${suffix}`,
    });
    if (!companion) throw new Error("companion was not created");

    const first = await getOrCreateConversation({
      userId: ownerId,
      companionId: companion.id,
      companionName: input.name,
      viewerId: ownerId,
    });
    const second = await getOrCreateConversation({
      userId: ownerId,
      companionId: companion.id,
      companionName: input.name,
      viewerId: ownerId,
    });

    expect(first?.id).toBe(second?.id);
  });

  it("refuses a conversation with a companion the viewer cannot see", async () => {
    const companion = await createCompanion(ownerId, {
      ...input,
      name: `Hidden Chat Companion ${suffix}`,
      visibility: "private",
    });
    if (!companion) throw new Error("companion was not created");

    expect(
      await getOrCreateConversation({
        userId: strangerId,
        companionId: companion.id,
        companionName: input.name,
        viewerId: strangerId,
      }),
    ).toBeNull();
  });
});
