/**
 * Teacher session — a tiny reactive wrapper around Lovable Cloud auth.
 *
 * The rest of the app only needs "is a teacher signed in, and who". Keeping
 * that here means pages never talk to the auth client directly.
 */

import { useUser } from "@clerk/react";

export type SessionState = {
  loading: boolean;
  session: { userId: string } | null;
  user: { id: string; email?: string | null; displayName?: string | null } | null;
};

export function useSession(): SessionState {
  const { isLoaded, user } = useUser();
  const teacher = user
    ? {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? null,
        displayName: user.fullName ?? user.firstName ?? null,
      }
    : null;
  return { loading: !isLoaded, session: teacher ? { userId: teacher.id } : null, user: teacher };
}

