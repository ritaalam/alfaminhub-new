import { jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const workspacesTable = pgTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    state: jsonb("state").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("workspaces_user_id_unique").on(table.userId)],
);

export const workspaceRevisionsTable = pgTable("workspace_revisions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  label: text("label").notNull(),
  state: jsonb("state").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});