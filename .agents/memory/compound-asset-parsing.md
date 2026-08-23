---
name: Compound asset parsing
description: Semantic planning can misread a compound asset label as a second standalone object requirement.
---

Natural-language worksheet requests containing the compound asset label `seahorse` can also introduce a `horse` requirement, causing finalization to reject the worksheet or mix horse artwork into an otherwise valid seahorse activity.

**Why:** Semantic extraction and planner validation must agree on the teacher's explicitly named visual object; a false secondary requirement blocks Studio before any renderer can be inspected.

**How to apply:** Give standalone aliases word boundaries when they can occur inside a compound asset name, and test the finalized object set as well as renderer markup. Keep deterministic renderer/print validation in addition to the browser flow; a stray standalone term is a planning-contract issue, not evidence that the asset renderer or its manifest fallback is broken.