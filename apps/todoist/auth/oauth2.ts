import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 with a Todoist app. The client_id / client_secret / redirect_uri
 * live on the w6w server, not in this package, so the `todoist.com` authorize
 * and token hosts are handled host-side and never appear in `network.allow`.
 *
 * Todoist issues an opaque bearer access token (no refresh token), sent with
 * the same `Authorization: Bearer <token>` scheme as the personal API token —
 * one `sign` per credential type.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Todoist)",
  description: "Public OAuth flow. Requires a Todoist app registered on this w6w installation.",
  oauth2: {
    authorizationUrl: "https://todoist.com/oauth/authorize",
    tokenUrl: "https://todoist.com/oauth/access_token",
    scopes: ["data:read_write", "data:delete"],
    scopeSeparator: ",",
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
    const res = await ctx.fetch(`${API_URL}/projects`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Todoist returned ${res.status}` };
    return { ok: true };
  },
};

export default oauth2;
