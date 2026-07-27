import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 with a Webflow App. The client_id / client_secret / redirect_uri
 * live on the w6w server, not in this package. Unlike a site API token, an
 * OAuth access token can span every site the authorizing user grants — the same
 * `Bearer` scheme signs both credential types, one per Connection.
 *
 * Webflow separates scopes by a literal space (`%20` once URL-encoded) and does
 * not use PKCE.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Connect Webflow)",
  description: "Public OAuth flow. Requires a Webflow App registered on this w6w installation.",
  connectionLabel: "{{user.firstName}} {{user.lastName}} ({{user.email}})",
  oauth2: {
    authorizationUrl: "https://webflow.com/oauth/authorize",
    tokenUrl: "https://api.webflow.com/oauth/access_token",
    scopes: [
      "sites:read",
      "cms:read",
      "cms:write",
      "ecommerce:read",
      "ecommerce:write",
      "authorized_user:read",
    ],
    scopeSeparator: " ",
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
    const res = await ctx.fetch(`${API_URL}/sites`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Webflow returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/token/authorized_by`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return {};
    const user = await res.json().catch(() => ({}));
    return { user };
  },
};

export default oauth2;
