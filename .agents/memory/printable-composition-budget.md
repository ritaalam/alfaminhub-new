---
name: Printable composition budget
description: How to preserve educational space while evolving printable worksheet styling.
---

When adding or changing printable page framing, header hierarchy, or footer treatment, reserve its height in the shared layout budget before changing activity rows.

**Why:** Printable worksheets must balance visual polish with large, usable child response targets. Decorative chrome that is not represented in the layout budget silently steals space from mechanics, increasing clipping and collision risk on dense pages.

**How to apply:** Treat the header, footer, safe margins, and activity area as one measured composition. Run the renderer’s layout checks across page counts, mechanics, paper sizes, and print modes whenever any of those shared visual regions change.