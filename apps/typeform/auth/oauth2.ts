import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 with a Typeform application. The client_id / client_secret /
 * redirect_uri live on the w6w server, not in this package.
 *
 * The access token is sent with the `Bearer` scheme, exactly like a personal
 * access token — Typeform accepts either credential form on the same endpoints.
 * Scopes are space-separated (the OAuth default), so no `scopeSeparator` is set.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Typeform)",
  description:
    "Public OAuth flow. Requires a Typeform application registered on this w6w installation.",
  connectionLabel: "{{account.email}}",
  oauth2: {
    authorizationUrl: "https://api.typeform.com/oauth/authorize",
    tokenUrl: "https://api.typeform.com/oauth/token",
    scopes: [
      "accounts:read",
      "forms:read",
      "forms:write",
      "responses:read",
      "responses:write",
      "workspaces:read",
      "themes:read",
      "images:read",
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
    const res = await ctx.fetch(`${API_URL}/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Typeform returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/me`, { headers: { accept: "application/json" } });
    if (!res.ok) return {};
    const account = await res.json().catch(() => ({}));
    return { account };
  },
};

export default oauth2;
