import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type OAuthResult = {
  redirect_url?: string;
  redirect_to?: string;
  client?: { name?: string; client_name?: string; redirect_uri?: string };
  scope?: string;
};

type OAuthApi = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: OAuthResult | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: Error | null }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({
        to: "/auth",
        search: { next: location.pathname + location.searchStr },
      });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md p-10 text-center">
      <h1 className="text-xl font-semibold">Authorization request could not be loaded</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "this app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-8">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          Connect {clientName} to Alfa Mind Hub
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This lets {clientName} use Alfa Mind Hub&rsquo;s worksheet tools as you while you are
          signed in. It does not bypass this app&rsquo;s permissions or backend policies.
        </p>
        {details?.client?.redirect_uri ? (
          <p className="mt-3 break-all text-xs text-muted-foreground">
            Redirects to {details.client.redirect_uri}
          </p>
        ) : null}
        {details?.scope ? (
          <p className="mt-3 text-xs text-muted-foreground">Requested access: {details.scope}</p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void decide(true)}
            className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void decide(false)}
            className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-medium disabled:opacity-60"
          >
            Cancel connection
          </button>
        </div>
      </div>
    </main>
  );
}
