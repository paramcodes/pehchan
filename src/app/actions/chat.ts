"use server";

import { redirect } from "next/navigation";
import { getCompanionBySlug } from "@/db/companions";
import { getOrCreateConversation } from "@/db/chat";
import { requireUserForAction } from "@/lib/session";

export async function startChatAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  if (!slug) redirect("/explore");

  const session = await requireUserForAction(`/c/${slug}`);
  const companion = await getCompanionBySlug(slug, session.user.id);

  if (!companion) redirect("/explore?error=Companion+not+found");

  const conversation = await getOrCreateConversation({
    userId: session.user.id,
    companionId: companion.id,
    companionName: companion.name,
    viewerId: session.user.id,
  });

  if (!conversation) redirect(`/c/${slug}`);
  redirect(`/chat/${conversation.id}`);
}
