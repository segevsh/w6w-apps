import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";
import { OPAQUE_401, PROBE_PATH } from "./api-key.ts";

/**
 * Housecall Pro OAuth 2.0 — authorization code flow, `Authorization: Bearer`.
 *
 * Every value below is quoted from `docs/authentication.md` in the vendor's own
 * Stoplight project, fetched 2026-08-11, and cross-checked against the
 * `Housecall User OAuth Token` security scheme in the OpenAPI document.
 *
 * ## The two hosts are different, and that is not a typo
 *
 *  - **Authorization**: `https://pro.housecallpro.com/oauth/authorize` — the
 *    user-facing login and consent screen.
 *  - **Token exchange / refresh**: `https://api.housecallpro.com/oauth/token`.
 *
 * The page states it twice, the second time explicitly: "The OAuth flow begins
 * at pro.housecallpro.com/oauth/authorize (for user interaction), but all token
 * exchanges happen via api.housecallpro.com/oauth/token."
 *
 * `pro.housecallpro.com` is deliberately **absent** from the app's
 * `network.allow`: no Action calls it, and the host allowlists OAuth endpoint
 * hosts implicitly.
 *
 * ## Partners only
 *
 * "OAuth 2.0 is available exclusively for official integration partners. All
 * other developers should use API key authentication." A `CLIENT_ID` and
 * `CLIENT_SECRET` are issued by email after review, together with the redirect
 * URI they are bound to. There is no self-service registration, so this method
 * is the right one only for a published integration.
 *
 * ## What is NOT declared here, and why
 *
 *  - **`pkce`** is set to `false`. The documented flow authenticates the token
 *    exchange with `client_secret` and never mentions `code_challenge` or
 *    `code_verifier`. The spec's default for `pkce` is `true`, so leaving it out
 *    would have this app send a challenge the vendor never documented accepting.
 *  - **`scopes`** carries the single value the vendor demonstrates, `public`.
 *    The page describes `REQUESTED_SCOPES` as issued per partner "(if
 *    applicable)" and shows `scope=public` in its worked example; no scope
 *    catalogue is published anywhere in the reference. Inventing a list would be
 *    guessing at an authorization surface, which is the worst place to guess.
 *  - **`revokeUrl`** is omitted. The page documents authorization, exchange and
 *    refresh, and describes revocation only as something the *user* does from
 *    their Housecall Pro account — there is no documented revoke endpoint to
 *    call, so `revoke` is not implemented either.
 *
 * ## Expiry
 *
 * `expires_in` was 2,592,000 seconds (30 days) in the documented exchange
 * response and 2,629,745 in the documented refresh response. A refresh is a
 * `POST /oauth/token` with `grant_type=refresh_token`, and an expired access
 * token answers `401` — the 2023-11-21 changelog entry records that expiry
 * being *fixed* to do so, which is the reason a stale token now fails loudly
 * instead of silently working.
 */

export interface HousecallOAuthCredential {
  /** The host stores the exchange response; `access_token` is the bearer. */
  access_token?: string;
  token?: string;
}

/**
 * Pull the bearer out of whichever key the host stored it under.
 *
 * The token endpoint answers `{"access_token": …, "token_type": "Bearer", …}`,
 * and a host that normalises OAuth credentials to `{token}` is equally valid —
 * so both are accepted rather than assuming one and failing silently.
 */
export function bearerToken(credential: Partial<HousecallOAuthCredential>): string {
  return (credential?.access_token ?? credential?.token ?? "").trim();
}

/** The one place the wire format is built, shared by `sign`, `test` and `afterConnect`. */
export function authHeaders(
  credential: Partial<HousecallOAuthCredential>,
): Record<string, string> {
  return { authorization: `Bearer ${bearerToken(credential)}` };
}

const oauth: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth 2.0 (integration partners)",
  description:
    "For approved Housecall Pro integration partners only. Request a client id and secret from " +
    "apideveloper@housecallpro.com with your application name, purpose and redirect URI. " +
    "Everyone else should use the API Key method.",
  connectionLabel: "Housecall Pro ({{companyName}})",
  oauth2: {
    authorizationUrl: "https://pro.housecallpro.com/oauth/authorize",
    tokenUrl: `${API_BASE}/oauth/token`,
    refreshUrl: `${API_BASE}/oauth/token`,
    scopes: ["public"],
    // Documented flow is client_secret only; see the module note.
    pkce: false,
  },

  /**
   * The only hook handed the raw credential, and it runs network-less.
   *
   * `Bearer` here, `Token ` for an API key — the two prefixes are not
   * interchangeable on this API and swapping them is a 401 indistinguishable
   * from a revoked credential.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<HousecallOAuthCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * Same probe as the API key method, for the same reason: `GET /company` is one
   * of the 31 operations whose `security` lists the OAuth token, it returns no
   * credential material, and `docs/franchise.md` notes that an OAuth token sees
   * only the locations its user may access — so `/company`'s `locations` array
   * is also the honest answer to "what can this token reach".
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<HousecallOAuthCredential>;
    const token = bearerToken(cred);
    if (!token) return { ok: false, message: "credential missing access_token" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ access_token: token }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { message?: string } | null;
    const detail = body?.message ? `: ${body.message}` : "";

    if (res.status === 401) {
      return {
        ok: false,
        message: `Housecall Pro answered 401${detail}. ${OPAQUE_401}, so this is an expired, ` +
          "revoked or unrecognised access token. Access tokens last about 30 days; refresh with " +
          "grant_type=refresh_token against api.housecallpro.com/oauth/token.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `Housecall Pro refused the company read (403${detail}). The token is live but ` +
          "the authorising user has no access to this location.",
      };
    }
    return { ok: false, message: `Housecall Pro returned HTTP ${res.status} for ${PROBE_PATH}` };
  },

  /** Company name only, for the Connection label. See the API key method's note. */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<HousecallOAuthCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { id?: string; name?: string };
      if (!body?.name) return {};
      return body.id ? { companyName: body.name, companyId: body.id } : { companyName: body.name };
    } catch {
      return {};
    }
  },
};

export default oauth;
