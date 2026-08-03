import type { AuthDefinition } from "@w6w/types";
import { normalizeSiteUrl } from "../lib/client.ts";

/**
 * Metabase API key — the `X-API-Key` header.
 *
 * ## The wire format, from the vendor
 *
 * Metabase's OpenAPI document (`metabase/metabase`, `docs/api.json`, fetched
 * 2026-08-03) declares exactly one security scheme:
 *
 *     "securitySchemes": {
 *       "ApiKeyAuth": { "type": "apiKey", "in": "header",
 *                       "name": "X-API-Key",
 *                       "description": "API key for authentication" }
 *     }
 *
 * and the docs page for API keys gives the matching curl:
 *
 *     curl -H 'X-API-Key: YOUR_API_KEY' \
 *          -X GET 'http://localhost:3000/api/permissions/group'
 *
 * A key is minted at **Admin settings → Authentication → API keys → Create API
 * key**, against a **group**, and inherits that group's permissions exactly
 * ("The key will have the same permissions granted to that group"). Metabase
 * shows the key once and never again; if the group is deleted the key is
 * reassigned to All Users. Keys carry no documented expiry.
 *
 * Verified on the wire against Metabase **v0.63.2.7** (a stock
 * `metabase/metabase:latest` container) on 2026-08-03. A key looks like
 * `mb_` + base64, and `GET /api/api-key` lists keys with only a `masked_key`.
 *
 * ## Why NOT the session-token flow
 *
 * Metabase's older mechanism is `POST /api/session` with a username and
 * password, which returns `{"id": "<uuid>"}` — a session token sent as the
 * `X-Metabase-Session` header. It still works (verified: both the login and the
 * header returned 200 on v0.63.2.7), and it is what n8n's Metabase node uses.
 * It is deliberately not shipped here, for three reasons in descending order of
 * severity:
 *
 *  1. **`sign` cannot make a network call.** The hook that attaches a credential
 *     to a request is network-less by design. A session token has to be fetched
 *     before it can be attached, so a session flow must resolve the token at
 *     connect time via `exchange` (the `apps/odoo` precedent) — which then has
 *     to cope with the token expiring underneath a Connection that looks fine.
 *  2. **Session tokens expire and the deadline is not knowable from outside.**
 *     Metabase's session lifetime is an instance setting (`MAX_SESSION_AGE`,
 *     default 14 days) and can be shortened further by a session-timeout policy
 *     an admin sets. Nothing in the login response says when the token dies, so
 *     an unattended workflow would fail at an unpredictable time with a 401 and
 *     no way to distinguish "expired" from "revoked".
 *  3. **It requires storing a human's password**, not a scoped credential. An
 *     API key is bound to a group and can be regenerated or deleted without
 *     touching anyone's account.
 *
 * If a Metabase old enough to lack API keys ever has to be supported, add a
 * second `AuthDefinition` with an `exchange` hook rather than bending this one.
 *
 * ## Why the site URL is a field here and not an action param
 *
 * The instance URL is half the credential's identity: a key minted on
 * `metabase.acme.com` is meaningless on `analytics.example.org`. Metabase's own
 * OpenAPI document lists a single server, `http://localhost:3000` — i.e. the
 * host is whatever the operator chose. Putting the URL on the Connection keeps
 * the two halves together and keeps every action host-agnostic;
 * `tests/index.test.ts` asserts no action can take a site/host/origin param.
 *
 * It is a plain `string`, not a `secret`. A URL is an address, not a secret, and
 * masking it would make a typo impossible to spot.
 */

export interface MetabaseCredential {
  siteUrl: string;
  apiKey: string;
}

/**
 * The one place the wire format is built. Exported so `test` exercises the same
 * code path `sign` does — a hand-rolled second copy is exactly how a probe ends
 * up sending a header the real requests do not.
 */
export function authHeaders(credential: Partial<MetabaseCredential>): Record<string, string> {
  return { "x-api-key": credential.apiKey ?? "" };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Mint a key at Admin settings → Authentication → API keys on your Metabase, then paste it " +
    "here with the instance URL. The key inherits the permissions of the group you assign it to.",
  connectionLabel: "{{user.name}} @ {{site.host}}",
  apiKey: {
    in: "header",
    name: "X-API-Key",
    prefix: "",
  },
  fields: [
    {
      key: "siteUrl",
      label: "Metabase URL",
      type: "string",
      required: true,
      placeholder: "https://metabase.example.com",
      hint: "The root URL of your Metabase — self-hosted or Metabase Cloud. No trailing path; a " +
        "trailing `/api` is stripped for you.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Admin settings → Authentication → API keys → Create API key. Assign it to the " +
        "narrowest group that can see the data you need — the key inherits that group's " +
        "permissions. Metabase shows the key once and cannot show it again.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it stamps
   * the header onto the outbound request and returns it.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<MetabaseCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * `GET /api/user/current` is the probe, and it was chosen by reading its
   * response body rather than by its name.
   *
   * The concern is the Up Boss / Mailjet failure mode — a `/me`-shaped endpoint
   * that echoes the caller's own credential back, turning a liveness check into
   * a credential-disclosure path. Metabase does not do this. Verified on the
   * wire on 2026-08-03 against v0.63.2.7, the full response for an API-key
   * caller is a **synthetic user record** describing the key, with no key
   * material in it:
   *
   *     {"id":2,
   *      "email":"api-key-user-54b19524-…@api-key.invalid",
   *      "first_name":"w6w probe",        ← the KEY'S NAME, not a person
   *      "last_name":"", "common_name":"w6w probe",
   *      "group_ids":[1,2], "is_superuser":true, "is_active":true,
   *      "permissions":{"can_create_queries":true,
   *                     "can_create_native_queries":true},
   *      "date_joined":…, "last_login":null, "locale":null, …}
   *
   * Every field is either an identifier, a timestamp or a permission flag. The
   * only thing derived from the key is its **display name**, which the admin
   * chose and which is already visible in the Metabase UI to anyone who can see
   * the key list. `tests/auth/api-key.test.ts` pins this by asserting the probe
   * path and that the app never reads `unmasked_key`.
   *
   * For completeness, the near-miss that *was* rejected: `GET /api/api-key`
   * lists the instance's keys, and a naive reading of `POST /api/api-key`'s
   * response — which does return `unmasked_key` — suggests the list might too.
   * It does not (verified: the list returns only `masked_key`), but it is an
   * admin-scoped endpoint that exposes other people's credentials' metadata, so
   * it would be the wrong probe regardless of what it returns. It is banned from
   * the whole app by a source-grep test.
   *
   * `GET /api/user/current` is also the narrowest thing a key can be asked: it
   * needs no permission beyond existing. Probing a collection or a database
   * would report a correctly-scoped key as broken whenever its group simply has
   * not been granted that data — which is the *desired* configuration.
   *
   * The status codes are distinguished because Metabase's are unusually blunt:
   * a rejected key is `401` with the plain-text body `Unauthenticated` — not
   * JSON, and not a 403. Verified for a malformed key, an empty header and no
   * header at all; all three answer identically.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<MetabaseCredential>;
    if (!cred?.siteUrl) return { ok: false, message: "credential missing siteUrl" };
    if (!cred?.apiKey) return { ok: false, message: "credential missing apiKey" };

    let base: string;
    try {
      base = normalizeSiteUrl(cred.siteUrl);
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }

    const res = await ctx.fetch(`${base}/api/user/current`, {
      headers: { accept: "application/json", ...authHeaders(cred) },
    });

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message:
          `Metabase rejected the key (${res.status}). Check that it was minted on this instance ` +
          "and has not been deleted or regenerated.",
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message: "No Metabase at this URL — /api/user/current is not routed here.",
      };
    }
    if (!res.ok) return { ok: false, message: `Metabase returned HTTP ${res.status}` };

    // A 200 that is not a user record means something else is answering on this
    // origin — a reverse proxy's login page, a captive portal, a parked domain.
    // Metabase is very commonly behind exactly such a proxy, so this is not
    // theoretical.
    const user = await res.json().catch(() => null) as { id?: number } | null;
    if (!user || typeof user.id !== "number") {
      return {
        ok: false,
        message: "Host answered but did not return a Metabase user — is this URL really Metabase?",
      };
    }
    return { ok: true };
  },

  /**
   * Records the instance origin and the acting identity on the Connection, so
   * the client can build URLs — and a UI can label the Connection — without
   * either ever seeing the key.
   *
   * The name published here is the API key's own display name (Metabase puts it
   * in `common_name` / `first_name` for a key-authenticated caller), which is
   * the most useful label available: it is what the admin typed when creating
   * the key, so "Reporting bot @ metabase.acme.com" reads correctly. `email` is
   * NOT published — for an API key it is the synthetic `…@api-key.invalid`
   * address, which would be actively misleading in a UI.
   *
   * The site URL is normalised here rather than at each use, so
   * `display.siteUrl` is a bare origin regardless of what the user pasted.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<MetabaseCredential>;
    if (!cred?.siteUrl) return {};

    let siteUrl: string;
    try {
      siteUrl = normalizeSiteUrl(cred.siteUrl);
    } catch {
      return {};
    }

    let user: { id?: number; common_name?: string; is_superuser?: boolean } = {};
    const res = await ctx.fetch(`${siteUrl}/api/user/current`, {
      headers: { accept: "application/json" },
    });
    if (res.ok) user = await res.json().catch(() => ({})) as typeof user;

    return {
      siteUrl,
      site: { host: new URL(siteUrl).host },
      user: {
        id: user.id,
        name: user.common_name,
        isSuperuser: user.is_superuser,
      },
    };
  },
};

export default apiKey;
