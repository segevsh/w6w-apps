import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 with a user-managed Zoom app — the browser sign-in path, for acting
 * as the individual who connected rather than as the account.
 *
 * Because it depends on a signed-in user, it is unavailable to background runs
 * once the refresh token lapses; `server-to-server` is the one to use for
 * scheduled work.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Zoom)",
  description: "Public OAuth flow. Requires a Zoom OAuth app registered on this w6w installation.",
  connectionLabel: "{{user.email}}",
  oauth2: {
    authorizationUrl: "https://zoom.us/oauth/authorize",
    tokenUrl: "https://zoom.us/oauth/token",
    refreshUrl: "https://zoom.us/oauth/token",
    scopes: ["meeting:read", "meeting:write", "user:read", "recording:read"],
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
    if (!res.ok) return { ok: false, message: `Zoom returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/me`);
    if (!res.ok) return {};
    const me = await res.json().catch(() => ({})) as {
      id?: string;
      email?: string;
      first_name?: string;
    };
    return { user: { id: me.id, email: me.email, name: me.first_name } };
  },
};

export default oauth2;
