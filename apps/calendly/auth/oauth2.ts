import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — the "public integrator" path. You register an OAuth app
 * on Calendly (Integrations → OAuth), store the resulting `client_id` /
 * `client_secret` / `redirect_uri` on the w6w server via
 * PUT /apps/:id/oauth-config/oauth2, and end users then connect via the browser
 * authorization dance.
 *
 * Calendly specifics:
 *   - Endpoints live on `auth.calendly.com`; the API itself on `api.calendly.com`.
 *     The OAuth hosts are added to this method's allowlist implicitly, exactly as
 *     the runtime does for any `oauth2` config, so `api.calendly.com` is the only
 *     entry in `network.allow`.
 *   - **No granular scopes.** Calendly's OAuth grants access to the authorizing
 *     user's resources as a whole, so no `scopes` are declared.
 *   - **PKCE is supported** and used here for public clients.
 *   - Access tokens expire after 2 hours; a rotating refresh token is issued, so
 *     `refreshUrl` is declared for silent renewal.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Calendly)",
  description:
    "Public OAuth flow. Requires a Calendly OAuth app (client_id / client_secret / redirect_uri) configured on this w6w installation.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  oauth2: {
    authorizationUrl: "https://auth.calendly.com/oauth/authorize",
    tokenUrl: "https://auth.calendly.com/oauth/token",
    refreshUrl: "https://auth.calendly.com/oauth/token",
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
    const res = await ctx.fetch(`${API_URL}/users/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Calendly returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/me`);
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      resource?: { uri?: string; name?: string; email?: string; current_organization?: string };
    };
    const u = body.resource ?? {};
    return {
      user: {
        uri: u.uri,
        name: u.name,
        email: u.email,
        organization: u.current_organization,
      },
    };
  },
};

export default oauth2;
