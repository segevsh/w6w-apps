import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 with a Pipedrive OAuth app. The client_id / client_secret /
 * redirect_uri live on the w6w server, not in this package.
 *
 * Two things worth knowing:
 *
 *   - Unlike the API token (a query param), an OAuth access token is sent with
 *     the `Bearer` scheme in the Authorization header — one posture per method.
 *   - The authorize/token endpoints live on `oauth.pipedrive.com`, a different
 *     host from the `api.pipedrive.com` egress allowlist. That is deliberate:
 *     OAuth endpoint hosts are added to the auth hook's allowlist implicitly by
 *     the host, so they are not (and must not be) restated in `network.allow`.
 *     A Pipedrive OAuth token also authenticates against the shared
 *     `api.pipedrive.com/v1` base, so no per-company `api_domain` juggling is
 *     needed.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Pipedrive)",
  description:
    "Public OAuth flow. Requires a Pipedrive OAuth app registered on this w6w installation.",
  connectionLabel: "{{user.name}} ({{company.name}})",
  oauth2: {
    authorizationUrl: "https://oauth.pipedrive.com/oauth/authorize",
    tokenUrl: "https://oauth.pipedrive.com/oauth/token",
    // Pipedrive grants scopes per registered app; these cover every resource
    // this app touches. Space-separated, which is the OAuth default.
    scopes: [
      "base",
      "deals:full",
      "contacts:full",
      "activities:full",
      "leads:full",
    ],
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
    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Pipedrive returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return {};
    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      data?: { name?: string; email?: string; company_name?: string };
    };
    const me = body.data ?? {};
    return {
      user: { name: me.name ?? me.email ?? "Pipedrive user", email: me.email },
      company: { name: me.company_name ?? "Pipedrive" },
    };
  },
};

export default oauth2;
