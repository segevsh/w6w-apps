import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — the "public integrator" path: one Acuity Scheduling
 * OAuth app, many end users. Register an app on Acuity, store the resulting
 * `client_id` / `client_secret` / `redirect_uri` on the w6w server via
 * PUT /apps/:id/oauth-config/oauth2, and end users then connect via the
 * browser authorization dance.
 *
 * Acuity specifics (developers.acuityscheduling.com/docs/oauth2, verified
 * 2026-08-01 by fetching the live docs page):
 *   - Authorize URL: https://acuityscheduling.com/oauth2/authorize
 *   - Token URL: https://acuityscheduling.com/oauth2/token
 *   - Both endpoints live on the same host as the API itself
 *     (acuityscheduling.com), so `network.allow` needs no separate entry for
 *     them (the runtime allows OAuth endpoint hosts implicitly regardless).
 *   - **Single fixed scope** `api-v1` — Acuity's OAuth grants access to the
 *     authorizing account's API as a whole; there is nothing finer to select.
 *   - The docs show a `client_secret`-based token exchange with no
 *     `code_verifier` parameter, so PKCE is not documented as supported;
 *     `pkce` is set `false` here (the spec's default is `true`).
 *   - The docs show no `refresh_token` in the token response and no
 *     documented expiry, so no `refreshUrl` is declared.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Acuity Scheduling)",
  description:
    "Public OAuth flow. Requires an Acuity Scheduling OAuth app (client_id / client_secret / redirect_uri) configured on this w6w installation.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  oauth2: {
    authorizationUrl: "https://acuityscheduling.com/oauth2/authorize",
    tokenUrl: "https://acuityscheduling.com/oauth2/token",
    scopes: ["api-v1"],
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Acuity Scheduling returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me`);
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as { name?: string; email?: string };
    return { user: { name: body.name, email: body.email } };
  },
};

export default oauth2;
