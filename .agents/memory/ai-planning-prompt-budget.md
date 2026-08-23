---
name: AI planning prompt budget
description: The validated planner request limit must accommodate detailed teacher briefs.
---

Detailed teacher worksheet prompts may exceed a short API request limit even when they are fully supported by the local parser and renderer. Keep the shared planning contract sized for complete multi-page requirements; otherwise the API rejects the request before the managed AI call and Quick Create correctly—but unexpectedly—shows its local fallback state.

**Why:** A detailed three-page classroom brief needs all of its page-specific mechanics, quantities, response modes, and visual constraints preserved in the original request.

**How to apply:** When changing the planner request schema, test it with a realistic long multi-page prompt through the browser and regenerate the shared OpenAPI client and server validators together.