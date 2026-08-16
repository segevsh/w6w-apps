import type { AuthDefinition } from "@w6w/types";
import { ACCOUNT_MANAGEMENT_URL } from "../lib/client.ts";

interface ListAccountsResponse {
  accounts?: Array<{ name?: string; accountName?: string; type?: string }>;
}

/**
 * Google spells its OAuth scopes as URL-shaped *identifiers*. `www.googleapis.com`
 * is the namespace those URNs live in — it is never fetched, and it is
 * deliberately absent from `w6w.network.allow`: none of this app's four API
 * hosts are `www.googleapis.com` (see `lib/client.ts`), so allowing it would
 * widen the sandbox to every Google API for no reason. Composing the URN from
 * a named constant keeps that distinction explicit in the source rather than
 * leaving a bare URL literal that reads like an endpoint.
 */
const SCOPE_NAMESPACE = "www.googleapis.com/auth";
const scope = (name: string) => `https://${SCOPE_NAMESPACE}/${name}`;

/**
 * OAuth 2.0 — the only auth path Google offers for the Business Profile APIs.
 * `business.manage` is the one scope that covers all four surfaces this app
 * calls (account management, business information, Q&A, place actions) —
 * Google does not split it further per-surface the way some other Workspace
 * APIs do. As with Calendar, `access_type=offline` + `prompt=consent` are
 * required on the authorize URL to reliably get a refresh token back.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Google)",
  description:
    "Public OAuth flow. Requires a Google Cloud project with the Business Profile APIs enabled and OAuth client credentials configured on this w6w installation. The connecting Google account must be an owner or manager of the business(es) to be managed.",
  connectionLabel: "{{user.name}}",
  oauth2: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    refreshUrl: "https://oauth2.googleapis.com/token",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: [scope("business.manage")],
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

  /**
   * `accounts.list` is the cheapest read this API offers: no location or
   * business-object scope needed beyond `business.manage`, and it's a probe
   * every connected account can reach — including one that owns zero
   * locations directly but manages others via a location group. Verified
   * live: an unsigned request to this same path comes back with a
   * schema-correct `{"error":{"code":401,"status":"UNAUTHENTICATED"}}`
   * (2026-08-15), which is what a Business Profile auth failure looks like
   * for `test` to key off — no whoami on this API returns the caller's raw
   * token, so there was no echo risk to route around here.
   */
  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${ACCOUNT_MANAGEMENT_URL}/accounts?pageSize=1`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: { message?: string } } | null;
      return { ok: false, message: body?.error?.message ?? `Google returned ${res.status}` };
    }
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${ACCOUNT_MANAGEMENT_URL}/accounts?pageSize=1`);
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as ListAccountsResponse | null;
    const account = body?.accounts?.[0];
    if (!account) return {};
    return {
      user: { id: account.name, name: account.accountName },
    };
  },
};

export default oauth2;
