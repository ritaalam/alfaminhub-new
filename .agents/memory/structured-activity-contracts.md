---
name: Structured activity contracts
description: How to preserve cross-domain Idea Lab game interactions such as Memory Pairs.
---

Structured Idea Lab activities carry an explicit interaction contract. If that interaction is cross-domain (for example, Memory Pairs), planning and validation must retain it even when prompt parsing would otherwise classify the wording into another learning domain.

**Why:** Reinterpreting the activity through a generic domain fallback changes the child interaction and causes the handoff contract to fail, preventing the worksheet from opening.

**How to apply:** When extending planner or validator rules, keep explicit source contracts ahead of inferred prompt/domain fallbacks. Continue to use age-appropriate content density rather than swapping the selected game for a different activity.