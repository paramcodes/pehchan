import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { categories, companions, conversations, memories } from "@/db/schema";
import type { CompanionFormInput } from "@/domain/companion";
import { slugify } from "@/domain/companion";
import { toTsQuery } from "@/domain/search";

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
};

export type CompanionListItem = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  imageUrl: string;
  visibility: "public" | "private";
  categoryId: string;
  categoryName: string;
  categorySlug: string;
};

export type CompanionDetail = CompanionListItem & {
  ownerId: string | null;
  description: string;
  greeting: string;
  instructions: string;
  examples: { user: string; assistant: string }[];
  createdAt: Date;
};

const listColumns = {
  id: companions.id,
  name: companions.name,
  slug: companions.slug,
  tagline: companions.tagline,
  imageUrl: companions.imageUrl,
  visibility: companions.visibility,
  categoryId: companions.categoryId,
  categoryName: categories.name,
  categorySlug: categories.slug,
} as const;

export async function listCategories(): Promise<Category[]> {
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function listCompanions(options: {
  query?: string;
  categorySlug?: string;
  limit?: number;
}): Promise<CompanionListItem[]> {
  const filters = [eq(companions.visibility, "public")];

  if (options.categorySlug) {
    filters.push(eq(categories.slug, options.categorySlug));
  }

  const query = options.query?.trim();
  if (query) {
    const tsQuery = toTsQuery(query);
    const searchFilters = [
      ilike(companions.name, `%${query}%`),
      ilike(companions.tagline, `%${query}%`),
      ilike(categories.name, `%${query}%`),
    ];

    if (tsQuery) {
      searchFilters.push(
        sql`to_tsvector('english', ${companions.name} || ' ' || ${companions.tagline} || ' ' || ${companions.description}) @@ to_tsquery('english', ${tsQuery})`,
      );
    }

    const combined = or(...searchFilters);
    if (combined) filters.push(combined);
  }

  return db
    .select(listColumns)
    .from(companions)
    .innerJoin(categories, eq(companions.categoryId, categories.id))
    .where(and(...filters))
    .orderBy(asc(categories.sortOrder), asc(companions.name))
    .limit(options.limit ?? 48);
}

export async function listFeaturedCompanions(limit = 4): Promise<CompanionListItem[]> {
  return listCompanions({ limit });
}

export async function getCompanionBySlug(
  slug: string,
  viewerId?: string,
): Promise<CompanionDetail | null> {
  const visibilityFilter = viewerId
    ? or(eq(companions.visibility, "public"), eq(companions.ownerId, viewerId))
    : eq(companions.visibility, "public");

  const [row] = await db
    .select({
      ...listColumns,
      ownerId: companions.ownerId,
      description: companions.description,
      greeting: companions.greeting,
      instructions: companions.instructions,
      examples: companions.examples,
      createdAt: companions.createdAt,
    })
    .from(companions)
    .innerJoin(categories, eq(companions.categoryId, categories.id))
    .where(and(eq(companions.slug, slug), visibilityFilter))
    .limit(1);

  return row ?? null;
}

export async function getOwnedCompanion(
  id: string,
  ownerId: string,
): Promise<CompanionDetail | null> {
  const [row] = await db
    .select({
      ...listColumns,
      ownerId: companions.ownerId,
      description: companions.description,
      greeting: companions.greeting,
      instructions: companions.instructions,
      examples: companions.examples,
      createdAt: companions.createdAt,
    })
    .from(companions)
    .innerJoin(categories, eq(companions.categoryId, categories.id))
    .where(and(eq(companions.id, id), eq(companions.ownerId, ownerId)))
    .limit(1);

  return row ?? null;
}

export async function listOwnedCompanions(ownerId: string): Promise<CompanionListItem[]> {
  return db
    .select(listColumns)
    .from(companions)
    .innerJoin(categories, eq(companions.categoryId, categories.id))
    .where(eq(companions.ownerId, ownerId))
    .orderBy(desc(companions.updatedAt));
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "companion";
  const [existing] = await db
    .select({ id: companions.id })
    .from(companions)
    .where(eq(companions.slug, base))
    .limit(1);

  if (!existing) return base;
  return `${base}-${randomUUID().slice(0, 6)}`;
}

export async function createCompanion(ownerId: string, input: CompanionFormInput) {
  const [row] = await db
    .insert(companions)
    .values({
      ownerId,
      categoryId: input.categoryId,
      name: input.name,
      slug: await uniqueSlug(input.name),
      tagline: input.tagline,
      description: input.description,
      imageUrl: input.imageUrl,
      greeting: input.greeting,
      instructions: input.instructions,
      examples: input.examples,
      visibility: input.visibility,
    })
    .returning({ id: companions.id, slug: companions.slug });

  return row;
}

export async function updateCompanion(id: string, ownerId: string, input: CompanionFormInput) {
  const [row] = await db
    .update(companions)
    .set({
      categoryId: input.categoryId,
      name: input.name,
      tagline: input.tagline,
      description: input.description,
      imageUrl: input.imageUrl,
      greeting: input.greeting,
      instructions: input.instructions,
      examples: input.examples,
      visibility: input.visibility,
      updatedAt: new Date(),
    })
    .where(and(eq(companions.id, id), eq(companions.ownerId, ownerId)))
    .returning({ id: companions.id, slug: companions.slug });

  return row ?? null;
}

export async function deleteCompanion(id: string, ownerId: string): Promise<boolean> {
  const [row] = await db
    .delete(companions)
    .where(and(eq(companions.id, id), eq(companions.ownerId, ownerId)))
    .returning({ id: companions.id });

  return Boolean(row);
}

export async function countCatalogue(): Promise<{ companions: number; categories: number }> {
  const [companionCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(companions)
    .where(eq(companions.visibility, "public"));
  const [categoryCount] = await db.select({ count: sql<number>`count(*)::int` }).from(categories);

  return {
    companions: companionCount?.count ?? 0,
    categories: categoryCount?.count ?? 0,
  };
}

export async function countConversations(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(conversations)
    .where(eq(conversations.userId, userId));

  return row?.count ?? 0;
}

export async function countMemories(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(memories)
    .where(eq(memories.userId, userId));

  return row?.count ?? 0;
}
