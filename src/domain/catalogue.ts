import type { CompanionExample } from "@/domain/companion";

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
  examples: CompanionExample[];
  createdAt: Date;
};
