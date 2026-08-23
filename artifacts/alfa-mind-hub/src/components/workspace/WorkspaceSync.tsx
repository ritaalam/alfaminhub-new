/**
 * Keeps the workspace store pointed at the right persistence layer:
 * browser storage when signed out, the teacher's private cloud account when
 * signed in. Also offers a one-time import of existing browser-only work.
 */

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/cloud/session";
import { configureWorkspaceStorage, refreshWorkspace } from "@/lib/workspace/store";
import { localWorkspaceStorage } from "@/lib/workspace/storage";
import {
  createCloudWorkspaceStorage,
  fetchCloudWorkspace,
  mergeWorkspaces,
  pushCloudWorkspace,
  resetCloudStatus,
} from "@/lib/workspace/cloud-storage";
import type { WorkspaceState } from "@/lib/workspace/types";

function hasContent(s: WorkspaceState) {
  return (
    s.drafts.length > 0 ||
    s.ideas.length > 0 ||
    s.classes.length > 0 ||
    s.folders.length > 0 ||
    s.collections.length > 0
  );
}

export function WorkspaceSync() {
  const { user, loading } = useSession();
  const configuredFor = useRef<string | null>(null);
  const [offerImport, setOfferImport] = useState<WorkspaceState | null>(null);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    const uid = user?.id ?? null;
    if (configuredFor.current === uid) return;
    configuredFor.current = uid;

    if (!uid) {
      resetCloudStatus();
      configureWorkspaceStorage(localWorkspaceStorage);
      setOfferImport(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const cloud = await fetchCloudWorkspace(uid);
        if (cancelled) return;
        configureWorkspaceStorage(createCloudWorkspaceStorage(uid, cloud));
        const local = localWorkspaceStorage.read();
        const importedKey = `alfa.workspace.imported.${uid}`;
        const alreadyOffered =
          typeof window !== "undefined" && window.localStorage.getItem(importedKey) === "1";
        if (!alreadyOffered && hasContent(local) && !hasContent(cloud)) {
          setOfferImport(local);
        }
      } catch {
        // stay on browser storage rather than losing the teacher's work
        configureWorkspaceStorage(localWorkspaceStorage);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, loading]);

  async function runImport() {
    if (!user || !offerImport) return;
    setImporting(true);
    try {
      const cloud = await fetchCloudWorkspace(user.id);
      const merged = mergeWorkspaces(cloud, offerImport);
      await pushCloudWorkspace(user.id, merged);
      configureWorkspaceStorage(createCloudWorkspaceStorage(user.id, merged));
      refreshWorkspace();
      window.localStorage.setItem(`alfa.workspace.imported.${user.id}`, "1");
      setOfferImport(null);
      setDone("Your existing workspace was imported to your account.");
      setTimeout(() => setDone(null), 6000);
    } catch {
      setDone("Import failed — your local work is untouched. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  function dismiss() {
    if (user) window.localStorage.setItem(`alfa.workspace.imported.${user.id}`, "1");
    setOfferImport(null);
  }

  if (!offerImport && !done) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-border bg-background p-4 shadow-lg print:hidden">
      {offerImport ? (
        <>
          <p className="font-display text-sm font-semibold text-foreground">
            Import my existing workspace
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            We found {offerImport.drafts.length} worksheet
            {offerImport.drafts.length === 1 ? "" : "s"} and {offerImport.ideas.length} saved idea
            {offerImport.ideas.length === 1 ? "" : "s"} saved in this browser. Bring them into your
            account so they are available on every device.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runImport()}
              disabled={importing}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {importing ? "Importing…" : "Import my existing workspace"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-cream"
            >
              Not now
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-foreground">{done}</p>
      )}
    </div>
  );
}
