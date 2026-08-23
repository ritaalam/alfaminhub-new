---
name: GitHub API project push
description: How to publish a complete local Git snapshot through Replit's GitHub connector when shell credentials are unavailable.
---

When publishing a complete local project through the Replit GitHub connector, use the authenticated Git Data API rather than assuming a shell `git push` can access the OAuth credential. Upload blobs from the workspace, create a tree, commit it, and update the target branch.

**Why:** Connector credentials stay inside the proxy and are not available to the shell. A brand-new empty GitHub repository can return `409 Git Repository is empty` for Git blob creation, so it must first receive a tiny initialization commit. The final project tree can then replace that initializer on the target branch.

**How to apply:** Keep the initialization commit as a temporary API prerequisite, build the final tree from all tracked files (including binary files), parent the import commit on the initializer, update the branch ref, and verify the remote tree count and absence of the initializer before reporting success.