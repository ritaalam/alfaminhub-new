---
name: Prompt-first worksheet contracts
description: Preserve explicit teacher wording as a verifiable requirement throughout worksheet generation and editing.
---

Explicit prompt facts are the primary contract for a worksheet. Preserve recognised objects, teacher-named subjects, quantities, activity/mechanic, layout, language, print mode, paper, and visual constraints through every planning and Studio path. AI may enrich only fields that are not prompt-derived. If the renderer lacks an exact illustration for a requested object or theme, retain the teacher's wording and use the nearest safe, supported visual representation; only reject requirements whose mechanics or print constraints cannot be met.

**Why:** A correct-looking worksheet can still violate the teacher's intent when free-text requirements are collapsed into a broad theme, an unrelated UI default, or an illustration-library limitation.

**How to apply:** Parse prompt requirements before planning, freeze them with the generated project, resolve exact known assets first, then preserve unknown teacher labels with a deterministic nearest visual fallback. Detailed count/object pairs are atomic contracts, and “choices for each group” requires a per-row numeral-choice mechanic rather than a shared answer bank. Validate quantities, mechanics, page directives, and print constraints before saving/printing/exporting; block Studio actions that violate those explicit constraints.

For explicitly named two-column matching activities, preserve each column's ordered labels and its row-to-row pairing through rendering, saving, reload, and export. Resolve overlapping phrases as one most-specific item (for example, a fish bowl is not both a fish and a bowl), and do not replace a specific teacher label with a generic asset label.

**Why:** A worksheet can use the right overall Matching mechanic yet still be wrong when a generic pair template, overlapping noun match, or shuffled explicit list changes the teacher's stated associations.

**How to apply:** Treat an explicit left/right prompt as a paired-content contract: build the displayed cards and answer mapping from the parsed lists, validate their shared cardinality, and carry the resulting labels in the saved project. Once saving succeeds, navigation must also retain the stable draft identity so a reload restores that same verified contract rather than opening a fresh creator.