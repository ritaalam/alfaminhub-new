---
name: Paper-aware activity density
description: How open-ended printable workloads must preserve local artwork minimum sizes on each paper format.
---

Open-ended worksheet generation must reduce the number of activity groups on smaller paper before shrinking local artwork below its approved print minimum. Explicit teacher-requested quantities and group counts remain authoritative and must not be silently reduced.

**Why:** Page-scale fitting alone can make a nominally valid Counting worksheet render detailed local art below its legible print size, especially when high quantities wrap within several rows. A smaller but readable open-ended workload is preferable to a denser page with ambiguous objects.

**How to apply:** When changing group counts, quantity ranges, paper sizes, row mechanics, or illustration minimums, run renderer validation across A4, Letter, and A5. Keep paper-specific budgets in the local generation path only; let explicit contracts surface an honest validation issue if they cannot fit.