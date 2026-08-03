import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Google spells its OAuth scopes as URL-shaped *identifiers*. `www.googleapis.com`
 * is the namespace those URNs live in — it is never fetched, and it is
 * deliberately absent from `w6w.network.allow`: this app's only API host is
 * `tasks.googleapis.com`, and allowing the generic Google API host would widen
 * the sandbox to every Google service for no reason. Composing the URN from a
 * named constant keeps that distinction explicit in the source rather than
 * leaving a bare URL literal that reads like an endpoint.
 */
const SCOPE_NAMESPACE = "www.googleapis.com/auth";
const scope = (name: string) => `https://${SCOPE_NAMESPACE}/${name}`;

/**
 * OAuth 2.0 — the only auth path Google offers for the Tasks API.
 *
 * You register an app in the Google Cloud Console, enable the Google Tasks API,
 * store the resulting `client_id` + `client_secret` + `redirect_uri` on the w6w
 * server, and end users then connect via the browser authorization dance.
 * Google requires `access_type=offline` + `prompt=consent` to reliably hand back
 * a refresh token on every consent.
 *
 * Scope choice: Google documents exactly two Tasks scopes —
 * `.../auth/tasks` (create, edit, organize, delete) and `.../auth/tasks.readonly`
 * (view only). This app writes, so it asks for the former only; `tasks` is a
 * superset of `tasks.readonly`, so requesting both would add nothing.
 * See https://developers.google.com/workspace/tasks/auth.
 *
 * There is deliberately no `afterConnect`: the Tasks API exposes no whoami, and
 * Google's userinfo endpoint would require an extra identity scope this app has
 * no reason to hold. A connection is therefore labelled by the host's default,
 * not by an invented identity lookup.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Google)",
  description:
    "Public OAuth flow. Requires a Google Cloud project with the Google Tasks API enabled and OAuth client credentials configured on this w6w installation.",
  oauth2: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    refreshUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: [
      scope("tasks"),
    ],
    // Google needs these on the authorize URL to hand back a refresh_token.
    extraAuthParams: {
      access_type: "offline",
      prompt: "consent",
    },
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    // `tasklists.list` is the cheapest read that proves a Tasks scope is
    // present, and it is reachable by `tasks.readonly` as well as `tasks` — so
    // this never reports a working, read-only credential as broken. Capping the
    // page at 1 keeps it cheap; an account with no lists still returns 200.
    const res = await ctx.fetch(`${API_URL}/users/@me/lists?maxResults=1`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Google Tasks returned ${res.status}` };
    return { ok: true };
  },
};

export default oauth2;
