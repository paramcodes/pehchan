"use server";

import {
  countCatalogue,
  getCompanionBySlug,
  listCategories,
  listCompanions,
  listFeaturedCompanions,
} from "@/db/companions";
import { getSession } from "@/lib/session";

export async function getHomePageData() {
  const [categories, featured, counts] = await Promise.all([
    listCategories(),
    listFeaturedCompanions(4),
    countCatalogue(),
  ]);

  return { categories, featured, counts };
}

export async function getExplorePageData(query: string, category?: string) {
  const [categories, companions] = await Promise.all([
    listCategories(),
    listCompanions({ query, categorySlug: category }),
  ]);

  return { categories, companions };
}

export async function getCompanionPageData(slug: string) {
  const session = await getSession();
  const companion = await getCompanionBySlug(slug, session?.user.id);
  if (!companion) return null;

  return {
    companion,
    isOwner: session?.user.id === companion.ownerId,
    isSignedIn: Boolean(session),
  };
}

export async function getCompanionMetadata(slug: string) {
  const companion = await getCompanionBySlug(slug);
  if (!companion) return null;

  return { title: companion.name, description: companion.tagline };
}
