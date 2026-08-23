import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, workspacesTable, workspaceRevisionsTable } from "@workspace/db";

const router: IRouter = Router();

function userIdFromRequest(req: Parameters<typeof getAuth>[0]) {
  return getAuth(req).userId;
}

router.get("/workspace", async (req, res): Promise<void> => {
  const userId = userIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in to access your workspace." });
    return;
  }

  const [workspace] = await db
    .select({ state: workspacesTable.state })
    .from(workspacesTable)
    .where(eq(workspacesTable.userId, userId))
    .limit(1);

  res.json({ state: workspace?.state ?? null });
});

router.put("/workspace", async (req, res): Promise<void> => {
  const userId = userIdFromRequest(req);
  const state = req.body?.state;
  if (!userId) {
    res.status(401).json({ error: "Sign in to save your workspace." });
    return;
  }
  if (state === null || typeof state !== "object" || Array.isArray(state)) {
    res.status(400).json({ error: "Workspace state must be an object." });
    return;
  }

  const [existing] = await db
    .select({ id: workspacesTable.id })
    .from(workspacesTable)
    .where(eq(workspacesTable.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(workspacesTable)
      .set({ state, updatedAt: new Date() })
      .where(and(eq(workspacesTable.id, existing.id), eq(workspacesTable.userId, userId)));
  } else {
    await db.insert(workspacesTable).values({ id: randomUUID(), userId, state });
  }

  res.json({ state });
});

router.post("/workspace/revisions", async (req, res): Promise<void> => {
  const userId = userIdFromRequest(req);
  const state = req.body?.state;
  if (!userId) {
    res.status(401).json({ error: "Sign in to save a revision." });
    return;
  }
  if (state === null || typeof state !== "object" || Array.isArray(state)) {
    res.status(400).json({ error: "Workspace state must be an object." });
    return;
  }
  await db.insert(workspaceRevisionsTable).values({
    id: randomUUID(),
    userId,
    label: "autosave",
    state,
  });
  res.status(201).json({ saved: true });
});

router.get("/workspace/revisions", async (req, res): Promise<void> => {
  const userId = userIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in to access revisions." });
    return;
  }
  const revisions = await db
    .select({ id: workspaceRevisionsTable.id, state: workspaceRevisionsTable.state, createdAt: workspaceRevisionsTable.createdAt })
    .from(workspaceRevisionsTable)
    .where(eq(workspaceRevisionsTable.userId, userId))
    .orderBy(desc(workspaceRevisionsTable.createdAt))
    .limit(20);
  res.json({ revisions });
});

export default router;