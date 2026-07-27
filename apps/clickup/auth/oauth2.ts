import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 with a ClickUp OAuth application. The client_id / client_secret /
 * redirect_uri live on the w6w server, not in this package.
 *
 * ClickUp's OAuth access token is sent the same way as a personal token — a raw
 * `Authorization: <access_token>` header with NO `Bearer` prefix (n8n sets
 * `keepBearer: false` for exactly this reason). ClickUp access tokens do not
 * expire and no refresh token is issued, so there is no `refresh` hook.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with ClickUp)",
  description:
    "Public OAuth flow. Requires a ClickUp OAuth application registered on this w6w installation.",
  connectionLabel: "{{user.username}} ({{user.email}})",
  oauth2: {
    authorizationUrl: "https://app.clickup.com/api",
    tokenUrl: "https://api.clickup.com/api/v2/oauth/token",
    // ClickUp grants access to whole workspaces at consent time, not via
    // granular scopes, so the scope list is empty.
    scopes: [],
    pkce: false,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = accessToken;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/user`, {
      headers: { authorization: accessToken },
    });
    if (!res.ok) return { ok: false, message: `ClickUp returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/user`);
    if (!res.ok) return {};
    const body = await res.json().catch(() => ({})) as {
      user?: { id?: number; username?: string; email?: string };
    };
    const u = body.user ?? {};
    return { user: { id: u.id, username: u.username, email: u.email } };
  },
};

export default oauth2;
