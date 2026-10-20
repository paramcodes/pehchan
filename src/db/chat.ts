import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { companions, conversations, memories, messages } from "@/db/schema";
import { embedText } from "@/lib/ai";
import { memoryScore, selectNovelMemories } from "@/domain/memory";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
};

export type ChatConversation = {
  id: string;
  title: string;
  companionId: string;
  companionName: string;
  companionSlug: string;
  companionTagline: string;
  companionImageUrl: string;
  companionGreeting: string;
  categoryName: string;
  createdAt: Date;
  lastMessageAt: Date;
};

export type RecentConversation = {
  id: string;
  title: string;
  companionName: string;
  companionSlug: string;
  companionImageUrl: string;
  lastMessageAt: Date;
};

const conversationColumns = {
  id: conversations.id,
  title: conversations.title,
  companionId: companions.id,
  companionName: companions.name,
  companionSlug: companions.slug,
  companionTagline: companions.tagline,
  companionImageUrl: companions.imageUrl,
  companionGreeting: companions.greeting,
  categoryName: sql<string>`(select name from categories where categories.id = ${companions.categoryId})`,
  createdAt: conversations.createdAt,
  lastMessageAt: conversations.lastMessageAt,
};

export async function listRecentConversations(
  userId: string,
  limit = 8,
): Promise<RecentConversation[]> {
  return db
    .select({
      id: conversations.id,
      title: conversations.title,
      companionName: companions.name,
      companionSlug: companions.slug,
      companionImageUrl: companions.imageUrl,
      lastMessageAt: conversations.lastMessageAt,
    })
    .from(conversations)
    .innerJoin(companions, eq(conversations.companionId, companions.id))
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(limit);
}

export async function getConversationForUser(
  conversationId: string,
  userId: string,
): Promise<ChatConversation | null> {
  const [row] = await db
    .select(conversationColumns)
    .from(conversations)
    .innerJoin(companions, eq(conversations.companionId, companions.id))
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .limit(1);

  return row ?? null;
}

export async function getOrCreateConversation(input: {
  userId: string;
  companionId: string;
  companionName: string;
  viewerId: string;
}): Promise<ChatConversation | null> {
  const [companion] = await db
    .select({ id: companions.id })
    .from(companions)
    .where(
      and(
        eq(companions.id, input.companionId),
        sql`(${companions.visibility} = 'public' or ${companions.ownerId} = ${input.viewerId})`,
      ),
    )
    .limit(1);

  if (!companion) return null;

  const [existing] = await db
    .select(conversationColumns)
    .from(conversations)
    .innerJoin(companions, eq(conversations.companionId, companions.id))
    .where(
      and(eq(conversations.userId, input.userId), eq(conversations.companionId, input.companionId)),
    )
    .orderBy(desc(conversations.lastMessageAt))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(conversations)
    .values({
      userId: input.userId,
      companionId: input.companionId,
      title: `Chat with ${input.companionName}`,
    })
    .returning({ id: conversations.id });

  if (!created) return null;
  return getConversationForUser(created.id, input.userId);
}

export async function listMessages(conversationId: string, limit = 80): Promise<ChatMessage[]> {
  const rows = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  return rows.reverse();
}

export async function appendMessage(input: {
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
}): Promise<ChatMessage | null> {
  const [row] = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(messages)
      .values({
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
      })
      .returning({
        id: messages.id,
        role: messages.role,
        content: messages.content,
        createdAt: messages.createdAt,
      });

    await tx
      .update(conversations)
      .set({ updatedAt: new Date(), lastMessageAt: new Date() })
      .where(eq(conversations.id, input.conversationId));

    return inserted;
  });

  return row ?? null;
}

export async function updateConversationTitle(
  conversationId: string,
  title: string,
): Promise<void> {
  await db
    .update(conversations)
    .set({ title: title.slice(0, 80), updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

export type RetrievedMemory = {
  id: string;
  content: string;
  importance: number;
  similarity: number;
};

export async function retrieveMemories(input: {
  userId: string;
  companionId: string;
  query: string;
  limit?: number;
  minSimilarity?: number;
}): Promise<RetrievedMemory[]> {
  const embedding = await embedText(input.query);
  if (!embedding) return [];

  const vector = `[${embedding.join(",")}]`;
  const limit = input.limit ?? 6;
  const minSimilarity = input.minSimilarity ?? 0.25;

  const result = await db.execute<{
    id: string;
    content: string;
    importance: number;
    similarity: number;
  }>(sql`
    select id, content, importance, 1 - (embedding <=> ${vector}::vector) as similarity
    from memories
    where user_id = ${input.userId}
      and companion_id = ${input.companionId}
      and 1 - (embedding <=> ${vector}::vector) >= ${minSimilarity}
    order by embedding <=> ${vector}::vector
    limit ${limit}
  `);

  const rows = result.rows.map((row) => ({
    ...row,
    importance: Number(row.importance),
    similarity: Number(row.similarity),
  }));

  if (rows.length > 0) {
    const ids = rows.map((row) => row.id);
    await db.update(memories).set({ lastUsedAt: new Date() }).where(inArray(memories.id, ids));
  }

  return rows.sort((left, right) => {
    const rightScore = memoryScore({
      similarity: right.similarity,
      importance: right.importance,
      ageInDays: 0,
    });
    const leftScore = memoryScore({
      similarity: left.similarity,
      importance: left.importance,
      ageInDays: 0,
    });
    return rightScore - leftScore;
  });
}

export async function saveExtractedMemories(input: {
  userId: string;
  companionId: string;
  conversationId: string;
  candidates: { content: string; importance: number }[];
}): Promise<number> {
  if (input.candidates.length === 0) return 0;

  const existingResult = await db.execute<{ content: string; embedding: string }>(sql`
    select content, embedding::text as embedding
    from memories
    where user_id = ${input.userId} and companion_id = ${input.companionId}
  `);

  const existing = existingResult.rows.map((row) => ({
    content: row.content,
    embedding: row.embedding
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map(Number)
      .filter((value) => Number.isFinite(value)),
    importance: 0.5,
  }));

  const embeddedCandidates = (
    await Promise.all(
      input.candidates.map(async (candidate) => {
        const embedding = await embedText(candidate.content);
        return embedding
          ? { content: candidate.content, embedding, importance: candidate.importance }
          : null;
      }),
    )
  ).filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null);

  const novel = selectNovelMemories(embeddedCandidates, existing, 0.92);
  if (novel.length === 0) return 0;

  await db.insert(memories).values(
    novel.map((memory) => ({
      userId: input.userId,
      companionId: input.companionId,
      conversationId: input.conversationId,
      content: memory.content,
      embedding: memory.embedding,
      importance: memory.importance,
    })),
  );

  return novel.length;
}

export async function countMemoriesForCompanion(
  userId: string,
  companionId: string,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(memories)
    .where(and(eq(memories.userId, userId), eq(memories.companionId, companionId)));

  return row?.count ?? 0;
}
