import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Splitwise API key — `Authorization: Bearer <key>`.
 *
 * Verified against `components.securitySchemes.ApiKeyAuth` in Splitwise's
 * OpenAPI 3.0.1 document (`type: http`, `scheme: bearer`,
 * `bearerFormat: API key`) and against live probes of `secure.splitwise.com` on
 * 2026-08-11.
 *
 * > For speed and ease of prototyping, you can generate a personal API key on
 * > your app's details page. You should present this key to the server via the
 * > Authorization header as a Bearer token. **The API key is an access token for
 * > your personal account, so keep it as safe as you would a password.**
 *
 * That last sentence is the whole security model: a Splitwise API key is not a
 * scoped integration token. It is full access to one human's account — every
 * group, every friend, every expense — and Splitwise offers no way to narrow
 * it. The only mitigation available is to regenerate the key on the app details
 * page, which invalidates the old one.
 *
 * ## Why OAuth 2 is NOT declared here, with the measurement
 *
 * The reference declares a second scheme, `OAuth`, an authorization-code flow
 * with `authorizationUrl: /oauth/authorize` and `tokenUrl: /oauth/token`
 * (relative, with `scopes: {}` — Splitwise defines no scopes). Both were probed
 * on 2026-08-11, resolved against the host root and against the documented
 * server `https://secure.splitwise.com/api/v3.0`:
 *
 *   | URL                                                | Method | Result                                     |
 *   | -------------------------------------------------- | ------ | ------------------------------------------ |
 *   | `secure.splitwise.com/oauth/authorize`             | GET    | **302 → `/login`** — routed                |
 *   | `secure.splitwise.com/api/v3.0/oauth/authorize`    | GET    | 404, site HTML                             |
 *   | `secure.splitwise.com/oauth/token`                 | GET    | 404, site HTML                             |
 *   | `secure.splitwise.com/oauth/token`                 | POST   | **404, site HTML — md5 `e7b1bed2c96c…`**   |
 *   | `secure.splitwise.com/api/v3.0/oauth/token`        | POST   | 404, site HTML                             |
 *   | `www.splitwise.com/oauth/token`                    | POST   | 404, site HTML                             |
 *
 * The POST was repeated with a form body, a JSON body, `Accept:
 * application/json` and HTTP Basic client credentials; every variant returned
 * the same 3,085-byte page, **byte-identical to the 404 for a nonsense path** on
 * the same host. That is routing, not authentication: the documented OAuth 2
 * token endpoint does not answer.
 *
 * What *does* answer, all with `401 Invalid OAuth Request` (21 bytes), is
 * `/oauth/request_token`, `/oauth/access_token` and
 * `/api/v3.0/get_access_token` — the **OAuth 1.0a** endpoint names, left over
 * from the flow Splitwise's own 2013 blog post describes and which the current
 * reference no longer documents.
 *
 * So an `oauth2` method here would render a Connect button that walks a user
 * through Splitwise's real consent screen and then fails at the token exchange
 * against a 404. Declaring it is left out until the live token URL is known;
 * this is a config block, not code, and adding it is four lines. The API key
 * path is complete and is what the reference recommends for exactly this use.
 *
 * ## What `test` can and cannot tell you
 *
 * Measured live on 2026-08-11, `GET /api/v3.0/get_current_user` returns the
 * **byte-identical** 54-byte body `{"error":"Invalid API Request: you are not
 * logged in"}` under HTTP 401 for all four of:
 *
 *   - no `Authorization` header at all
 *   - `Authorization: Bearer <syntactically valid but fake key>`
 *   - `Authorization: Bearer ` (empty)
 *   - `Authorization: Token abc` (wrong scheme)
 *
 * There is therefore no way — from the status code *or* from the body — to tell
 * "the credential never reached the request" from "the key was revoked". The
 * message below says so instead of guessing, because guessing sends people to
 * regenerate a perfectly good key.
 */

export interface SplitwiseCredential {
  apiKey: string;
}

/**
 * The one place the wire format is built. Exported so `test` and `afterConnect`
 * exercise the same code path `sign` does — a hand-rolled second copy is how a
 * probe ends up sending a header the real requests do not.
 */
export function authHeaders(credential: Partial<SplitwiseCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/**
 * The credential-liveness probe.
 *
 * `GET /api/v3.0/get_current_user` was chosen by reading its response schema
 * and by measuring the wire, not by its name:
 *
 * **(a) It genuinely requires a credential.** Unauthenticated it answers 401
 * (measured). That rules out the two obvious cheap alternatives, both of which
 * answered **HTTP 200 with their full payload and no credential at all** on
 * 2026-08-11 — they are named in `lib/client.ts#PUBLIC_ENDPOINTS`, deliberately
 * out of this module so a test can assert neither appears here. A Connection
 * whose key never got attached would sail straight through a probe against
 * either.
 *
 * **(b) It needs no scope.** Splitwise has no scopes — `scopes: {}` in the
 * OAuth flow, and an API key is unconditional account access — so there is no
 * narrower-credential case for this to fail on, unlike `get_groups` or
 * `get_expenses`, which can legitimately return nothing.
 *
 * **(c) It returns no credential material.** Its schema is `current_user` =
 * `user` (`id`, names, `email`, `registration_status`, `picture`) plus
 * `notifications_read`, `notifications_count`, `notifications` (a map of
 * boolean preferences), `default_currency` and `locale`. There is no API key,
 * no token, no password field anywhere in it — which is exactly what makes it a
 * safe probe where Mailjet's `/apikey` and Follow Up Boss's `/me`, which return
 * the caller's own live secret, are not.
 */
export const PROBE_PATH = "/get_current_user";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Register an app at https://secure.splitwise.com/apps and generate a personal API key on its " +
    "details page. The key is full access to your own Splitwise account — Splitwise offers no " +
    "way to scope it — so treat it as a password and regenerate it on that page if it leaks.",
  connectionLabel: "Splitwise ({{name}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "From your app's details page at secure.splitwise.com/apps. Splitwise's own note: " +
        '"The API key is an access token for your personal account, so keep it as safe as you ' +
        'would a password."',
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and returns. The key never appears in a URL —
   * Splitwise accepts no query-parameter form, and a workflow host logs request
   * URLs while it does not log request headers.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<SplitwiseCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint and not one of the public ones. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<SplitwiseCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });

    if (res.ok) {
      // A 200 is necessary but not sufficient: this API answers 200 with an
      // `errors` payload on failure, and the whoami must actually carry a user.
      const body = await res.json().catch(() => null) as { user?: { id?: number } } | null;
      if (body?.user?.id !== undefined) return { ok: true };
      return {
        ok: false,
        message: "Splitwise answered 200 but the response carried no user object",
      };
    }

    const body = await res.json().catch(() => null) as { error?: string } | null;
    const detail = typeof body?.error === "string" ? body.error : "";

    if (res.status === 401) {
      return {
        ok: false,
        message: "Splitwise rejected the request (401" + (detail ? `: ${detail}` : "") +
          "). It returns " +
          "this identical body whether the key is wrong, revoked, empty, or never reached the " +
          "request at all, so it cannot say which — re-copy the key from " +
          "secure.splitwise.com/apps, and regenerate it there if that does not help.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: "Splitwise accepted the key but refused the whoami (403" +
          (detail ? `: ${detail}` : "") + ")",
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        message:
          "Splitwise rate-limited the check (429). The key may well be fine; retry after a delay.",
      };
    }
    return { ok: false, message: `Splitwise returned HTTP ${res.status} for ${PROBE_PATH}` };
  },

  /**
   * Publish a display name, and nothing more.
   *
   * `get_current_user` also returns the account's `email`, which would make a
   * tidier label — and is deliberately not used. A connection label is rendered
   * in lists, embedded in run records and copied into logs; putting a personal
   * email address there spreads PII across surfaces that never needed it, for
   * an ergonomic gain a name already delivers. The user id is kept because two
   * accounts can share a name and nothing else disambiguates them.
   *
   * A failure here is silent by design: `test` has already established the key
   * is live, and a missing label must not fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<SplitwiseCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders(cred) },
      });
      if (!res.ok) return {};
      const body = await res.json().catch(() => null) as
        | { user?: { id?: number; first_name?: string; last_name?: string } }
        | null;
      const user = body?.user;
      if (!user) return {};
      const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
      if (!name) return user.id === undefined ? {} : { userId: user.id };
      return user.id === undefined ? { name } : { name, userId: user.id };
    } catch {
      return {};
    }
  },
};

export default apiKey;
