import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * OAuth 2.0 (`oauth2`) — Box's only supported end-user auth flow for a public
 * integrator. You register a Box "Custom App" (OAuth 2.0 login type) in the
 * Box Developer Console, store its `client_id` + `client_secret` +
 * `redirect_uri` on the w6w server via PUT /apps/:id/oauth-config/oauth2, and
 * end users then connect via the browser authorization dance.
 *
 * Box specifics:
 *   - Unlike Slack/Dropbox, Box does NOT accept a `scope` query parameter on
 *     the authorize URL. Scopes are configured once, on the app itself, in
 *     the Developer Console's "Application Scopes" section — an access token
 *     is minted with whatever the app is configured for, regardless of what
 *     (if anything) is requested in the URL. `scopes` below is therefore
 *     documentation of what must be enabled there, not a value sent on the
 *     wire: `root_readwrite` covers every action this app ships (read/list,
 *     upload, download, create/delete folders, search, shared links).
 *   - PKCE: Box's own OAuth guide (https://developer.box.com/guides/authentication/oauth2/without-sdk/)
 *     documents only the classic `client_secret` code exchange and says
 *     nothing about `code_challenge`/`code_verifier`. Rather than opt into
 *     PKCE on the strength of "most providers support it", this leaves it
 *     off (`pkce: false`) until Box's docs confirm it.
 *   - Refresh tokens rotate: every `grant_type=refresh_token` call returns a
 *     BOTH a new access token and a new (one-time-use) refresh token, valid
 *     ~60 days. No custom `refresh` hook is declared here — the standard
 *     `grant_type=refresh_token` POST to `tokenUrl` is handled generically by
 *     the host, which must persist the rotated refresh token it gets back.
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Box)",
  description:
    "Public OAuth flow. Requires a Box Custom App registration (client_id / client_secret / redirect_uri) configured on this w6w installation, with Application Scopes set to at least Read and write all files and folders.",
  connectionLabel: "{{user.name}} ({{user.email}})",
  oauth2: {
    authorizationUrl: "https://account.box.com/api/oauth2/authorize",
    tokenUrl: "https://api.box.com/oauth2/token",
    scopes: ["root_readwrite"],
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
    // /users/me identifies the caller and needs no particular scope beyond
    // basic account access — every valid token can reach it.
    const res = await ctx.fetch(`${API_URL}/users/me`, {
      method: "GET",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Box returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect(_input, ctx) {
    const res = await ctx.fetch(`${API_URL}/users/me`, { method: "GET" });
    if (!res.ok) return {};
    const user = await res.json() as { id?: string; name?: string; login?: string };
    return {
      user: {
        id: user.id,
        name: user.name,
        // Box calls the account email `login`.
        email: user.login,
      },
    };
  },
};

export default oauth2;
