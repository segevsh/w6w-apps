import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 with a Figma app. The client_id / client_secret / redirect_uri
 * live on the w6w server, not in this package. Every request signs with
 * `Authorization: Bearer <accessToken>` — unlike the personal-access-token
 * method, which signs with `X-Figma-Token`.
 *
 * Verified against https://developers.figma.com/docs/rest-api/oauth-apps/:
 * authorize at `https://www.figma.com/oauth`, exchange/refresh against
 * `api.figma.com`. Figma supports PKCE (S256) as an optional hardening on
 * top of the confidential client_id/client_secret exchange, and separates
 * scopes with a space. The scope list below covers exactly what this app's
 * actions call: file/node/image reads, comment read+write, project listing,
 * version history, and the current-user probe used by `test`.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Connect Figma)",
  description: "Public OAuth flow. Requires a Figma app registered on this w6w installation.",
  connectionLabel: "{{user.handle}} ({{user.email}})",
  oauth2: {
    authorizationUrl: "https://www.figma.com/oauth",
    tokenUrl: "https://api.figma.com/v1/oauth/token",
    refreshUrl: "https://api.figma.com/v1/oauth/refresh",
    scopes: [
      "file_content:read",
      "file_comments:read",
      "file_comments:write",
      "file_versions:read",
      "projects:read",
      "current_user:read",
    ],
    scopeSeparator: " ",
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
    const res = await ctx.fetch(`${API_URL}/v1/me`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Figma returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/v1/me`, { headers: { accept: "application/json" } });
    if (!res.ok) return {};
    const user = await res.json().catch(() => ({})) as {
      id?: string;
      handle?: string;
      email?: string;
      img_url?: string;
    };
    return { user };
  },
};

export default oauth2;
