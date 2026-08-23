---
name: Print-safe translucent artwork
description: Rules for artwork that should look light or translucent while remaining reliable in monochrome and ink-saving output.
---

For printable artwork that suggests translucency, use layered solid semantic palette roles, negative space, and outline or interior linework. Do not make recognition depend on gradients, fractional-opacity fills, or opacity effects.

**Why:** Classroom printing modes can flatten or remove subtle transparency effects, leaving a child unable to recognize the intended object.

**How to apply:** Keep the silhouette and its defining parts clear with solid paths in every print mode, and add runtime markup checks that reject transparency-dependent SVG features for that asset family.