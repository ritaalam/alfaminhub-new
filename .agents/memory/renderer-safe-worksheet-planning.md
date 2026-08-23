---
name: Renderer-safe worksheet planning
description: Keep AI and local worksheet plans inside the printable renderer's supported interaction set.
---

Worksheet planning must share an authoritative renderer-support policy with page-plan parsing and objective resolution. A named Advanced Create activity is a hard interaction contract: it may only generate when its own renderer exists, otherwise it must stop with a clear unsupported explanation. Quick Create's open-ended wording may still normalize an ambiguous legacy activity to a supported interaction before its page contract is frozen.

**Why:** A planner can produce a valid-looking activity label that reaches the printable stage even though its layout is unavailable. Replacing a named activity (for example, Maze) with an unrelated printable changes what the child does and breaks teacher trust.

**How to apply:** Add a mechanic/model/builder/validator/Studio renderer before marking a named Advanced activity as supported. Carry the same mechanic through page contracts, saved projects, print/PDF, and answer keys. Keep unsupported named options blocked; only Quick Create may normalize open-ended legacy wording.

Geometric mechanics such as Maze use verified structure (walls, boundaries, route and dead ends) rather than a collection of rendered object assets. Their contextual nouns may shape visual direction and visible copy, but asset-presence validation must not require those nouns in the activity payload. Keep object validation strict for mechanics that actually render countable or drawable assets.

**Why:** Applying a universal exact-object gate to a genuine geometric maze turns a correct Maze with a themed prompt such as “fish maze” into a generic generation failure.

**How to apply:** Scope any object-asset requirement to asset-bearing activity kinds. Preserve the full integrity checks that define the non-asset mechanic, and add both a themed-mechanic passing regression and an asset-bearing negative regression.