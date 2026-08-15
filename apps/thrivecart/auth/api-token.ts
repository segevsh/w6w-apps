import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * ThriveCart access token — `Authorization: Bearer <token>`.
 *
 * Verified against the published Postman collection's `auth` block
 * (`type: "bearer"`) and the PHP SDK's `request()` method, both accessed
 * 2026-08-15, plus live probes against `thrivecart.com` the same day.
 *
 * ThriveCart's developer portal describes two ways to get a token: an
 * account-level API key ("if you want to access your own account"), or an
 * OAuth2 app flow ("if you intend to create an application that lots of
 * ThriveCart users can all use"). The collection documents only the former —
 * a bearer token, no `oauth2` block, no scopes — so that is what this app
 * implements. Nothing here was inferred from the OAuth mention; a token
 * minted either way is presented the same way on the wire (the SDK's
 * `Oauth` class exchanges its own flow for the same kind of access token this
 * method collects directly).
 *
 * See `lib/client.ts` for the full writeup of what the credential-liveness
 * probe below actually returns for a bad token — it is not the shape the
 * collection documents.
 */

export interface ThriveCartCredential {
  apiToken: string;
}

/**
 * The one place the wire format is built, so `test` and `afterConnect`
 * exercise the same code path `sign` does.
 */
export function authHeaders(credential: Partial<ThriveCartCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiToken ?? ""}` };
}

/**
 * `GET /ping` — "Get information about the account that your API key or
 * access token grants access to. No parameters are required for this
 * endpoint. It's also useful to check the validity of your token." (the
 * collection's own description). It needs a credential, is not scoped to any
 * particular resource, and its response — account name/id/version/url plus
 * the calling user's id/username/name — carries no credential material, so it
 * doubles as the `account-get` Action (`actions/account-get.ts`).
 */
export const PROBE_PATH = "/ping";

const apiToken: AuthDefinition = {
  key: "api-token",
  type: "bearer",
  displayName: "API Access Token",
  description: "Paste an access token from ThriveCart > Settings > API & Webhooks.",
  connectionLabel: "ThriveCart ({{accountName}})",
  fields: [
    {
      key: "apiToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "ThriveCart > Settings > API & Webhooks.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<ThriveCartCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<ThriveCartCredential>;
    const token = (cred?.apiToken ?? "").trim();
    if (!token) return { ok: false, message: "credential missing apiToken" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiToken: token }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as
      | { error?: string; error_description?: string }
      | null;
    const code = body?.error;

    // Three shapes are possible for a 401 here (see lib/client.ts) — all are
    // read generically rather than switched on the one code the published
    // collection documents, because a real revoked/mistyped token (hyphenated,
    // like every real ThriveCart access token) produces the undocumented
    // `auth.*` family, not `invalid_token`.
    if (code === "auth.missing") {
      return {
        ok: false,
        message: "ThriveCart received no token. The credential did not reach the request — " +
          "reconnect this connection.",
      };
    }
    return {
      ok: false,
      message: `ThriveCart rejected the token (${res.status}${code ? ` ${code}` : ""}). Check ` +
        `it was copied exactly from Settings > API & Webhooks and has not been revoked.` +
        `${body?.error_description ? ` (${body.error_description})` : ""}`,
    };
  },

  /**
   * Publish the account name, and nothing else. `ping`'s response carries no
   * secret, but only the one field the connection label actually uses is
   * kept — everything else (`account_url`, `user_username`, …) is dropped on
   * the floor rather than published unexamined.
   *
   * A failure here is deliberately silent: `test` already established the
   * token is live, and a missing display label must not fail a good
   * Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<ThriveCartCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json() as { account_name?: string };
      return body.account_name ? { accountName: body.account_name } : {};
    } catch {
      return {};
    }
  },
};

export default apiToken;
