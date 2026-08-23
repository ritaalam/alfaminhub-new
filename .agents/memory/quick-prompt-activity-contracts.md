---
name: Quick prompt activity contracts
description: Preserve named Quick Create activity types from current prompt through preview, planning, and Studio.
---

For Quick Create, derive the activity type from the current non-empty prompt and treat a supported named interaction as a renderer contract. Preview metadata, the frozen generation specification, and the Studio mechanic must all use that same contract. A new prompt clears prior Quick/Idea/Advanced activity state; page-by-page briefs retain their own per-page directives instead of becoming a pack-wide activity type.

**Why:** A preview based on a stale learning skill can say “Counting Activity” after a teacher asks for Matching, while generic normalization can silently map unsupported or different activities into counting or another unrelated mechanic.

**How to apply:** Keep canonical prompt activity names in the renderer-support registry. Lock only named activities with one dedicated mechanic; Counting remains a supported family so its explicit layout and response wording can choose Count & Match or Count & Circle. Reject an unsupported named type with its renderer-specific message before generation rather than substituting another worksheet.

When a teacher changes a Quick Create prompt, replace the complete canonical request spec in the same state transition, then clear prior document, Studio, and draft-result metadata. Do not update only the prompt string and rely on a derived preview to repair a stale generated activity type.

During a select-all-and-retype handoff, clear the former prompt requirement contract immediately. The empty intermediary state may be visually neutral, but it must never present the prior named type or a generic worksheet type; explicit activity wording must then replace that neutral state before generation.