"use server";

import { redirect } from "next/navigation";
import { getCompanionBySlug } from "@/db/companions";
import {
  countMemoriesForCompanion,
  getConversationForUser,
  getOrCreateConversation,
  listMessages,
  listRecentConversations,
} from "@/db/chat";
import { getSession, requireUserForAction } from "@/lib/session";

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

export async function getChatsPageData() {
  const session = await getSession();
  if (!session) return null;

  const conversations = await listRecentConversations(session.user.id, 50);
  return { conversations };
}

export async function getChatPageData(conversationId: string) {
  const session = await getSession();
  if (!session) return null;

  const conversation = await getConversationForUser(conversationId, session.user.id);
  if (!conversation) return null;

  const [messages, recent, memoryCount] = await Promise.all([
    listMessages(conversation.id, session.user.id),
    listRecentConversations(session.user.id, 10),
    countMemoriesForCompanion(session.user.id, conversation.companionId),
  ]);

  return { conversation, messages, recent, memoryCount };
}
