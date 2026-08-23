---
name: Licensed illustration provider policy
description: Safe rules for optional external illustration providers alongside Alfa's local printable art.
---

External illustration lookups are an optional enhancement, never a requirement for worksheet generation. Alfa-authored local line art must remain the immediate, renderer-safe fallback whenever a provider is absent, unavailable, rate-limited, or unsuitable.

**Why:** Printable activities must stay available offline and preserve their object counts, answer keys, mechanics, and licensing posture without depending on a paid third-party API.

**How to apply:** Keep provider credentials server-side and disabled by default. Cache only metadata/remote URLs with a bounded TTL; never store binary assets in Postgres. Treat provider results as `review-required` metadata until the active license and attribution requirements have been explicitly approved, and never let external results mutate worksheet mechanics or answers.