import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const EMBEDDING_DIMENSIONS = 1536;

export type CompanionExample = {
  user: string;
  assistant: string;
};

export const companionVisibility = pgEnum("companion_visibility", ["public", "private"]);
export const messageRole = pgEnum("message_role", ["user", "assistant", "system"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("categories_slug_idx").on(table.slug)],
);

export const companions = pgTable(
  "companions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").references(() => user.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    tagline: text("tagline").notNull(),
    description: text("description").notNull(),
    imageUrl: text("image_url").notNull(),
    greeting: text("greeting").notNull(),
    instructions: text("instructions").notNull(),
    examples: jsonb("examples")
      .$type<CompanionExample[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    visibility: companionVisibility("visibility").notNull().default("public"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("companions_slug_idx").on(table.slug),
    index("companions_owner_id_idx").on(table.ownerId),
    index("companions_category_id_idx").on(table.categoryId),
    index("companions_visibility_idx").on(table.visibility),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    companionId: uuid("companion_id")
      .notNull()
      .references(() => companions.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New conversation"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("conversations_user_id_idx").on(table.userId),
    index("conversations_companion_id_idx").on(table.companionId),
    index("conversations_last_message_at_idx").on(table.lastMessageAt),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRole("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("messages_conversation_id_created_at_idx").on(table.conversationId, table.createdAt),
  ],
);

export const memories = pgTable(
  "memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    companionId: uuid("companion_id")
      .notNull()
      .references(() => companions.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
    importance: real("importance").notNull().default(0.5),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("memories_user_companion_idx").on(table.userId, table.companionId),
    index("memories_conversation_id_idx").on(table.conversationId),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  companions: many(companions),
  conversations: many(conversations),
  memories: many(memories),
}));

export const companionsRelations = relations(companions, ({ one, many }) => ({
  owner: one(user, { fields: [companions.ownerId], references: [user.id] }),
  category: one(categories, { fields: [companions.categoryId], references: [categories.id] }),
  conversations: many(conversations),
  memories: many(memories),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(user, { fields: [conversations.userId], references: [user.id] }),
  companion: one(companions, {
    fields: [conversations.companionId],
    references: [companions.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const memoriesRelations = relations(memories, ({ one }) => ({
  user: one(user, { fields: [memories.userId], references: [user.id] }),
  companion: one(companions, { fields: [memories.companionId], references: [companions.id] }),
  conversation: one(conversations, {
    fields: [memories.conversationId],
    references: [conversations.id],
  }),
}));
