---
name: Canonical artwork recipes
description: Durable rules for deterministic local artwork across preview, saved projects, and PDF export.
---

Every rendered printable asset must carry a versioned, deterministic local recipe from finalized worksheet data through every output surface. Pair-linked assets must derive their visual variant from the shared pair identity rather than the individual card identity.

**Why:** Re-resolving artwork at render time can silently alter saved worksheets, break identical-pair exercises, or make preview and PDF disagree after an engine update.

**How to apply:** Treat the finalized recipe as authoritative, including decorative printable assets. New composable art is opt-in per asset family: retain the existing local SVG renderer until that asset has its own family-specific recipe, rather than degrading it to a generic substitute.