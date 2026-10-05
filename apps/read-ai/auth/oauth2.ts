import type { AuthDefinition } from "@w6w/types";
import { API_BASE, formatReadAiError } from "../lib/client.ts";

/**
 * OAuth 2.1 (authorization code + PKCE + rotating refresh tokens) — the only
 * credential Read AI offers. Its overview article says so outright: "does not
 * yet support static API keys or client credentials"; static keys/PATs are
 * listed as a planned GA feature.
 *
 * Endpoints confirmed from `https://authn.read.ai/.well-known/openid-configuration`
 * (2026-10-05): authorize `authn.read.ai/oauth2/auth`, token
 * `authn.read.ai/oauth2/token`, revoke `authn.read.ai/oauth2/revoke`, dynamic
 * registration `api.read.ai/oauth/register`. The token host is `authn.read.ai`,
 * not `api.read.ai`; the host allowlists OAuth endpoints implicitly, so it is
 * not repeated in `network.allow`.
 *
 * ## Client registration is the operator's job
 *
 * There is no developer portal. You `POST /oauth/register` yourself to mint a
 * `client_id`/`client_secret` (shown once), configure them on this w6w
 * installation, and the user then connects through the usual browser flow. Read
 * AI's guide registers the redirect URI `https://api.read.ai/oauth/ui` and says
 * to leave everything but `client_name` unmodified; whether it accepts a w6w
 * callback URI instead is NOT documented and was not tested without a
 * credential. See the README.
 *
 * ## Tokens are short-lived
 *
 * Access tokens last 10 minutes (`expires_in: 599`). Refresh tokens ROTATE on
 * every use (short grace period for concurrency), so a refresh whose result
 * is not persisted breaks the chain. The `offline_access` scope is what yields a
 * refresh token at all.
 */

export interface ReadAiCredential {
  accessToken: string;
}

/** Scope `meeting:read` is the only one the REST API needs; the rest are OIDC basics. */
export const SCOPES = ["openid", "email", "profile", "offline_access", "meeting:read"];

/**
 * Credential probe: the narrowest read that exists, `GET /v1/meetings?limit=1`
 * (needs only `meeting:read`). Read AI also documents `/oauth/test-token-with-scopes`,
 * but publishes no response shape for it, so it cannot be classified by body.
 */
export const PROBE_PATH = "/v1/meetings?limit=1";

const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Read AI)",
  description: "Connect a Read AI account. Requires an OAuth client registered through Read AI's " +
    "dynamic client registration (POST https://api.read.ai/oauth/register) and configured on " +
    "this w6w installation.",
  oauth2: {
    authorizationUrl: "https://authn.read.ai/oauth2/auth",
    tokenUrl: "https://authn.read.ai/oauth2/token",
    refreshUrl: "https://authn.read.ai/oauth2/token",
    revokeUrl: "https://authn.read.ai/oauth2/revoke",
    scopes: SCOPES,
    scopeSeparator: " ",
    pkce: true,
  },

  /** The only hook handed the raw credential. Runs network-less. */
  sign({ request, credential }) {
    const { accessToken } = credential as Partial<ReadAiCredential>;
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  async test({ credential }, ctx) {
    const token = ((credential as Partial<ReadAiCredential>)?.accessToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
    });
    if (res.ok) return { ok: true };

    const message = await formatReadAiError(res);
    if (res.status === 401) {
      return {
        ok: false,
        message: `${message}. Access tokens last 10 minutes and refresh tokens rotate — ` +
          "reconnect if the refresh chain broke.",
      };
    }
    if (res.status === 429) {
      return { ok: false, message: `${message}. Rate limited (100 requests/minute); retry later.` };
    }
    return { ok: false, message };
  },
};

export default oauth2;
