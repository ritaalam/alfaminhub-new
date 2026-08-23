---
name: Managed AI planning fallback
description: Replit-managed OpenAI planning can time out in development even when its automatic credentials are provisioned.
---

Keep worksheet AI as a best-effort planner with a bounded timeout and a local deterministic fallback. Do not couple rendering, Studio, saving, or PDF export to an AI response.

**Why:** The managed OpenAI endpoint can exceed a short development-time request budget after credentials have been provisioned; the local generator must remain dependable for classroom work.

**How to apply:** Send only the compact prompt/spec planning payload. On any unavailable, malformed, or timed-out response, use the existing local prompt intent path without presenting a generation failure. When a prompt already provides an ordered count/object contract and a per-group choice count, skip optional AI planning entirely: the local deterministic plan is complete and authoritative.

For explicit Quick Create Maze, Matching, and Counting requests, skip optional AI planning and use the current prompt-derived specification directly.

**Why:** Each has a dedicated deterministic renderer, so provider planning can spend credits and introduce a competing activity-type authority without improving the printable result.

**How to apply:** Preserve the normal bounded planner behavior for open-ended prompts, but keep these named activity transitions local from preview through Studio, print, and PDF.

For GPT-5 worksheet planning, request minimal reasoning and retain enough response budget for the structured envelope; a `"length"` finish with no content means reasoning exhausted the response budget, not that the provider is unavailable.

**Why:** The planner can otherwise return an empty response after spending its complete allowance on hidden reasoning, which looks like malformed JSON and triggers an avoidable local fallback.

**How to apply:** Prefer a single appropriately provisioned request over retries, log only safe response metadata (finish reason, content length, refusal flag), and keep the browser timeout slightly above the provider timeout.