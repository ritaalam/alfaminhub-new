/**
 * Small, non-intrusive cloud autosave indicator: Saving… → Saved to cloud.
 */

import { useSyncExternalStore } from "react";
import { getCloudStatus, subscribeCloudStatus } from "@/lib/workspace/cloud-storage";

const serverSnapshot = { status: "idle" as const, statusMessage: null, lastSavedAt: null };

export function useCloudStatus() {
  return useSyncExternalStore(
    (l) => subscribeCloudStatus(l),
    getCloudStatus,
    () => serverSnapshot,
  );
}

export function CloudSaveStatus({ className = "" }: { className?: string }) {
  const { status, statusMessage, lastSavedAt } = useCloudStatus();
  if (status === "idle") return null;

  const label =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? lastSavedAt
          ? `Saved to cloud ${new Date(lastSavedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "Saved to cloud"
        : (statusMessage ?? "Not saved to cloud");

  return (
    <span
      className={`text-[11px] ${status === "error" ? "text-destructive" : "text-muted-foreground"} ${className}`}
      aria-live="polite"
    >
      {label}
    </span>
  );
}
