import type { AuthDefinition } from "@w6w/types";
import { AUTH_HEADER, classifyAuthFailure, normalizeStoreHash, storeBase } from "../lib/client.ts";

/**
 * BigCommerce API account access token — `X-Auth-Token: <access_token>`.
 *
 * Verified against the `X-Auth-Token` security scheme in every one of the twenty
 * OpenAPI documents this app was built from, against the vendor's
 * {@link https://docs.bigcommerce.com/developer/docs/overview/api-fundamentals/api-accounts API Accounts}
 * guide, and against live probes to `api.bigcommerce.com` — all on 2026-08-11.
 *
 * ## `custom`, not `bearer` or `apiKey`
 *
 * The type describes what actually goes on the wire. BigCommerce does **not**
 * use `Authorization` for the REST Management API: the token is its own header,
 * `X-Auth-Token`, with no scheme prefix. `apiKey` with
 * `{in: "header", name: "X-Auth-Token"}` would describe the header correctly but
 * this method also carries a second, non-secret field (the store hash), so
 * `custom` is the honest shape — the same choice `apps/shopify` makes for
 * `X-Shopify-Access-Token`.
 *
 * The one header BigCommerce used to want alongside it, `X-Auth-Client` (the
 * client ID), is documented as **"No longer required for any requests"**, so
 * this app never sends it and never collects the client ID.
 *
 * ## Two fields, and only one of them is a secret
 *
 * The **store hash** is a path segment (`/stores/{store_hash}/v3/…`), not a
 * hostname and not a credential — it appears in every request URL and in the
 * store's control panel. It is collected here because it identifies the account
 * rather than the operation, and republished by `afterConnect` into the
 * Connection's redacted `display` so Actions can build URLs without ever
 * touching the credential.
 *
 * ## Which credential this accepts
 *
 * A **store-level** API account token (Settings → Store-level API accounts) or
 * an **app-level** token issued to an installed app: the guide says both are
 * "passed as the value of the `X-Auth-Token` header", so both work unchanged.
 * An **account-level** token is deliberately out of scope — it is for the
 * GraphQL Account API, and it "provides direct access to **all** the account's
 * stores", which is a far wider blast radius than a workflow connection to one
 * store should carry.
 *
 * ## Scopes
 *
 * Tokens are scoped per API account, and a correctly narrow token is the
 * recommended configuration — so this app must treat one as healthy, not broken.
 * That constraint is what picks the probe below, and it is why an Action failing
 * with a 403 says so in words rather than as a bare status.
 */

export interface BigCommerceCredential {
  storeHash: string;
  accessToken: string;
}

/**
 * The credential-liveness probe.
 *
 * `GET /v2/time` is not a guess and not a whoami — it is the endpoint
 * BigCommerce's own OpenAPI document describes, verbatim, as
 * *"useful for validating API authentication details and testing client
 * connections"*. It is the right probe on all three axes:
 *
 * **(a) It requires a credential.** Unauthenticated it answers
 * `401 X-Auth-Token header is required` (measured 2026-08-11). There is no
 * unauthenticated read anywhere on `api.bigcommerce.com` for a probe to pass by
 * accident — every route in this app's surface was probed without a credential
 * and every one 401'd.
 *
 * **(b) It returns nothing secret.** The response is `{"time": <unix seconds>}`
 * and its schema (`timeStamp_Full`) has exactly that one property. Compare
 * `GET /v2/store`, the obvious alternative, which returns `admin_email`,
 * `order_email`, the owner's name, the account UUID and the plan — a whoami that
 * copies the merchant's contact details into the health surface on every check.
 * That endpoint is still reachable as the `store-get` Action, where a human asked
 * for it; a probe has no business putting it on the wire every minute.
 *
 * **(c) It is the cheapest thing in the API.** No collection scan, no
 * catalogue read, nothing that grows with the size of the store.
 */
export const PROBE_PATH = "/time";

/**
 * Why the store profile is not the probe — kept as an exported constant so the
 * reason survives the next person who notices `/v2/store` also proves the token
 * works.
 */
export const WHY_NOT_STORE_INFO =
  "GET /v2/store returns admin_email, order_email, the owner's name and the account UUID";

const accessToken: AuthDefinition = {
  key: "access-token",
  type: "custom",
  displayName: "API Account Access Token",
  description:
    "Create a store-level API account under Settings → Store-level API accounts, then paste its " +
    "access token and the store hash. Grant the account only the OAuth scopes your workflows " +
    "need — a narrowly scoped token is supported and recommended.",
  connectionLabel: "{{storeName}} ({{storeHash}})",
  fields: [
    {
      key: "storeHash",
      label: "Store hash",
      type: "string",
      required: true,
      placeholder: "abc123",
      hint:
        "The permanent store identifier that sits in every API URL. Take it from the API path " +
        "shown on the API account screen — the segment after `/stores/`. Pasting the whole API " +
        "path works too.",
    },
    {
      key: "accessToken",
      label: "Access token",
      type: "secret",
      required: true,
      hint:
        "Shown once, when the API account is created. It never expires on a timer, so treat it " +
        "as a long-lived secret and give this connection its own API account rather than sharing " +
        "one with other services.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it stamps
   * the vendor's own header and returns. The token never appears in a URL —
   * BigCommerce offers no query-parameter form for it, and would not be given
   * one if it did.
   */
  sign({ request, credential }) {
    const { accessToken } = credential as Partial<BigCommerceCredential>;
    request.headers[AUTH_HEADER] = String(accessToken ?? "");
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint and not the store profile. */
  async test({ credential }, ctx) {
    const cred = (credential ?? {}) as Partial<BigCommerceCredential>;
    const token = String(cred.accessToken ?? "").trim();
    const hash = normalizeStoreHash(cred.storeHash);
    if (!hash) return { ok: false, message: "credential missing storeHash" };
    if (/[/?#\s]/.test(hash)) {
      return {
        ok: false,
        message:
          `store hash ${JSON.stringify(hash)} is not a bare hash — paste the segment after ` +
          "`/stores/` in the API path",
      };
    }
    if (!token) return { ok: false, message: "credential missing accessToken" };

    const res = await ctx.fetch(`${storeBase(hash)}/v2${PROBE_PATH}`, {
      headers: { accept: "application/json", [AUTH_HEADER]: token },
    });
    if (res.ok) return { ok: true };

    // Classify from the BODY, never the status: a missing header, a malformed
    // header and a rejected token are three different problems that BigCommerce
    // reports with the same 401. See `classifyAuthFailure` for the measurements.
    const raw = await res.text().catch(() => "");
    switch (classifyAuthFailure(res.status, raw)) {
      case "missing-header":
        return {
          ok: false,
          message:
            "BigCommerce received no X-Auth-Token header. The credential did not reach the " +
            "request — reconnect this connection.",
        };
      case "malformed-header":
        return {
          ok: false,
          message: "BigCommerce saw an empty or malformed X-Auth-Token. Re-paste the access token.",
        };
      case "rejected":
        return {
          ok: false,
          message:
            "BigCommerce rejected the access token (401). Check it was copied exactly and that " +
            "its API account has not been deleted — deleting the account is the only way to " +
            "revoke a store-level token.",
        };
    }

    if (res.status === 403) {
      // The vendor's own troubleshooting entry for 403 lists both causes, and
      // nothing on the wire distinguishes them, so both are reported.
      return {
        ok: false,
        message:
          "BigCommerce refused the request (403). Either the store hash is wrong or the API " +
          "account lacks the Information & Settings scope.",
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message:
          `BigCommerce returned 404 for /v2${PROBE_PATH} — the store hash segment is malformed.`,
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        message:
          "Could not verify: the store's shared request quota is exhausted (429). This says " +
          "nothing about the token — retry in 30 seconds.",
      };
    }
    if (res.status === 503) {
      return {
        ok: false,
        message:
          "Could not verify: the store is down for maintenance, being upgraded, or suspended " +
          "(503). This says nothing about the token.",
      };
    }
    return { ok: false, message: `BigCommerce returned HTTP ${res.status} for /v2${PROBE_PATH}` };
  },

  /**
   * Publish the store hash and a display name, and nothing else.
   *
   * The store hash is republished here rather than only living in the credential
   * because Actions need it to build every URL and Actions must never read the
   * credential. `storeName` and `storeDomain` come from `GET /v2/store`, and this
   * hook takes exactly those two fields off that response and drops the rest on
   * the floor — `admin_email`, `order_email`, `first_name`, `last_name` and
   * `account_uuid` never leave this function. The endpoint that names the store
   * is the chatty one; the answer is to narrow what is *kept*.
   *
   * A failure here is deliberately silent, and specifically so for a **403**:
   * a token scoped away from Information & Settings is a perfectly good token,
   * and the store hash — the part the client actually needs — is already known.
   * A missing display label must not fail a working Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = (credential ?? {}) as Partial<BigCommerceCredential>;
    const hash = normalizeStoreHash(cred.storeHash);
    if (!hash) return {};
    const base: Record<string, unknown> = { storeHash: hash };
    try {
      const res = await ctx.fetch(`${storeBase(hash)}/v2/store`, {
        headers: {
          accept: "application/json",
          [AUTH_HEADER]: String(cred.accessToken ?? ""),
        },
      });
      if (!res.ok) return base;
      const body = await res.json() as { name?: string; domain?: string };
      if (body?.name) base.storeName = body.name;
      if (body?.domain) base.storeDomain = body.domain;
      return base;
    } catch {
      return base;
    }
  },
};

export default accessToken;
