---
name: Quick Create topic inference
description: Rules for mapping multiple explicit prompt objects to a stable Quick Create theme.
---

When Quick Create recognizes multiple explicitly named objects and no theme word is present, infer a topic only when every object belongs to that same topic. This prevents a retained UI default from conflicting with the teacher’s concrete request.

**Why:** A mixed request such as fish and starfish is unambiguously sea-creature content even without the word “ocean.” Retaining a default like Insects misrepresents the preview and can create a conflicting generation contract.

**How to apply:** Keep exact objects locked for the worksheet content, infer the shared topic only for the request theme, and use word-boundary aliases for short object words so prose does not introduce unrelated objects.