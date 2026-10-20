import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type ModelMessage,
  type UIMessage,
} from "ai";
import { z } from "zod";
import {
  appendMessage,
  getConversationForUser,
  listMessages,
  retrieveMemories,
  saveExtractedMemories,
  updateConversationTitle,
} from "@/db/chat";
import { getCompanionBySlug } from "@/db/companions";
import { buildCompanionPrompt } from "@/domain/prompt";
import { extractMemories, generateTitle, getChatModel } from "@/lib/ai";
import { isMockAi } from "@/lib/env";
import { buildMockReply } from "@/lib/mock-chat";
import { getSession } from "@/lib/session";

export const maxDuration = 60;

const bodySchema = z.object({
  conversationId: z.string().uuid(),
  messages: z.array(z.unknown()).min(1),
});

type IncomingMessage = {
  role?: string;
  content?: unknown;
  parts?: { type?: string; text?: string }[];
};

function messageText(message: IncomingMessage): string {
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("");
  }

  return typeof message.content === "string" ? message.content : "";
}

function lastUserText(messages: unknown[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index] as IncomingMessage | undefined;
    if (message?.role === "user") return messageText(message).trim();
  }
  return "";
}

function assistantText(messages: UIMessage[]): string {
  const last = messages.at(-1);
  return last ? messageText(last as IncomingMessage) : "";
}

async function persistAssistant(input: {
  conversationId: string;
  userId: string;
  userName: string;
  companionId: string;
  companionName: string;
  text: string;
}) {
  if (!input.text) return;

  await appendMessage({
    conversationId: input.conversationId,
    userId: input.userId,
    role: "assistant",
    content: input.text,
  });

  const recent = await listMessages(input.conversationId, input.userId, 16);
  const userTurns = recent.filter((message) => message.role === "user").length;

  if (userTurns === 1) {
    const title = await generateTitle({
      companionName: input.companionName,
      firstMessage: recent.find((message) => message.role === "user")?.content ?? input.text,
    });
    await updateConversationTitle(input.conversationId, input.userId, title);
  }

  if (userTurns % 2 !== 1) return;

  const transcript = recent
    .map(
      (message) =>
        `${message.role === "user" ? input.userName : input.companionName}: ${message.content}`,
    )
    .join("\n");

  const extracted = await extractMemories({
    companionName: input.companionName,
    userName: input.userName,
    transcript,
  });

  if (extracted.length > 0) {
    await saveExtractedMemories({
      userId: input.userId,
      companionId: input.companionId,
      conversationId: input.conversationId,
      candidates: extracted,
    });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Sign in to chat." }, { status: 401 });
  }

  const rawBody: unknown = await request.json();
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json({ error: "Invalid chat request." }, { status: 400 });
  }

  const userText = lastUserText(parsed.data.messages);
  if (!userText) {
    return Response.json({ error: "Message is empty." }, { status: 400 });
  }

  const conversation = await getConversationForUser(parsed.data.conversationId, session.user.id);
  if (!conversation) {
    return Response.json({ error: "Conversation not found." }, { status: 404 });
  }

  const companion = await getCompanionBySlug(conversation.companionSlug, session.user.id);
  if (!companion) {
    return Response.json({ error: "Companion not found." }, { status: 404 });
  }

  const history = await listMessages(conversation.id, session.user.id, 20);
  await appendMessage({
    conversationId: conversation.id,
    userId: session.user.id,
    role: "user",
    content: userText,
  });

  const memories = await retrieveMemories({
    userId: session.user.id,
    companionId: companion.id,
    query: userText,
  });

  const system = buildCompanionPrompt({
    companion,
    memories,
    userName: session.user.name,
  });

  const modelMessages: ModelMessage[] = history
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "user" ? "user" : "assistant",
      content: message.content,
    }));

  modelMessages.push({ role: "user", content: userText });

  const uiMessages = parsed.data.messages as UIMessage[];

  const finish = async (text: string) => {
    try {
      await persistAssistant({
        conversationId: conversation.id,
        userId: session.user.id,
        userName: session.user.name,
        companionId: companion.id,
        companionName: companion.name,
        text,
      });
    } catch (error) {
      console.error("Failed to persist assistant message.", error);
    }
  };

  if (isMockAi()) {
    const reply = buildMockReply({ companionName: companion.name, userText });

    const stream = createUIMessageStream({
      originalMessages: uiMessages,
      execute: async ({ writer }) => {
        const textId = crypto.randomUUID();
        writer.write({ type: "start-step" });
        writer.write({ type: "text-start", id: textId });

        for (const word of reply.split(" ")) {
          writer.write({ type: "text-delta", id: textId, delta: `${word} ` });
          await new Promise((resolve) => setTimeout(resolve, 18));
        }

        writer.write({ type: "text-end", id: textId });
        writer.write({ type: "finish-step" });
      },
      onEnd: async ({ messages }) => {
        await finish(assistantText(messages));
      },
    });

    return createUIMessageStreamResponse({ stream });
  }

  const result = streamText({
    model: getChatModel(),
    system,
    messages: modelMessages,
    temperature: 0.85,
    maxOutputTokens: 700,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: uiMessages,
      onEnd: async ({ messages }) => {
        await finish(assistantText(messages));
      },
    }),
  });
}
