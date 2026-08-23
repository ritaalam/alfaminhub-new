---
name: Count Circle native contract
description: The durable boundary between the Count & Circle mechanic and native SVG artwork families.
---

Count & Circle is a `quantityGroups` mechanic. Its rows, quantities, correct answers, and number choices are independent of the artwork family; every countable object is rendered through `WorksheetArt`.

**Why:** Native SVG families can be added or migrated independently. Binding the activity to fish, starfish, or another asset would force every future artwork migration to change educational activity code and invite mechanic drift.

**How to apply:** When adding a native family, register its artwork recipe and native eligibility. Validate the generic Count & Circle markers and per-row object/choice counts through the central renderer; do not add family-name branches to the activity.