/**
 * Teacher session — a tiny reactive wrapper around Lovable Cloud auth.
 *
 * The rest of the app only needs "is a teacher signed in, and who". Keeping
 * that here means pages never talk to the auth client directly.
 */

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type SessionState = {
  /** null while the session is still being restored */
  loading: boolean;
  session: Session | null;
  user: User | null;
};

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    loading: true,
    session: null,
    user: null,
  });

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setState({ loading: false, session, user: session?.user ?? null });
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setState({ loading: false, session: data.session, user: data.session?.user ?? null });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function signOutTeacher() {
  await supabase.auth.signOut();
}
