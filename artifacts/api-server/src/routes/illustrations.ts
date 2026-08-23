import { Router, type IRouter } from "express";
import { lookupExternalIllustrations } from "../lib/illustration-provider";

const router: IRouter = Router();

/**
 * Future-facing metadata endpoint. The frontend does not call this while the
 * provider is disabled, and the response cannot alter worksheet answers,
 * mechanics, or rendered object counts.
 */
router.get("/illustrations/search", async (req, res): Promise<void> => {
  const query = typeof req.query.q === "string" ? req.query.q : "";
  const cacheKey = typeof req.query.cacheKey === "string" ? req.query.cacheKey : undefined;
  const parsedLimit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
  if (!query.trim() || query.length > 180) {
    res.status(400).json({ error: "A short illustration query is required." });
    return;
  }

  const result = await lookupExternalIllustrations({ query, cacheKey, limit: parsedLimit });
  res.setHeader("Cache-Control", "private, max-age=300");
  res.json(result);
});

export default router;