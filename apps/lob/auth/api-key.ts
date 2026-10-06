import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Lob API key — HTTP Basic, the key as the username and an EMPTY password.
 *
 * Verified against Lob's OpenAPI document (`components.securitySchemes.basicAuth`:
 * `type: http, scheme: basic`; the Authentication section: "use your API key as the username
 * while leaving the password blank") and live probes of `api.lob.com` on 2026-10-06.
 *
 * ## Test and live
 *
 * There is ONE host. The key decides the environment: `test_…` runs Lob's sandbox (nothing is
 * printed, mailed or billed; verification endpoints return canned data) and `live_…` is real,
 * billed mail. A Connection holds one key, so connect one Connection per environment. The two
 * prefixes are also how this app labels a Connection (`afterConnect`), so a workflow author can
 * see at a glance which environment a step will hit.
 *
 * ## Publishable keys
 *
 * Lob also issues *publishable* keys (`test_pub_…` / `live_pub_…`), limited to US verification,
 * international verification and US autocomplete. They are a supported, deliberate
 * configuration, so the credential check must not call them broken: it probes with an endpoint
 * the key can reach (see {@link probeFor}).
 *
 * ## A missing key and a wrong key are both HTTP 401
 *
 * Measured live: no credential answers `401 {"error":{"code":"unauthorized","message":"Missing
 * authentication"}}`, a well-formed but unknown key answers `401 {"error":{"code":
 * "invalid_api_key"}}`. The status is identical, so validity is decided from the body's `code`,
 * and the two cases get different advice.
 */

export interface LobCredential {
  apiKey: string;
}

/** The one place the wire format is built, shared by `sign` and the probe. */
export function authHeaders(credential: Partial<LobCredential>): Record<string, string> {
  return { authorization: `Basic ${btoa(`${(credential.apiKey ?? "").trim()}:`)}` };
}

/** `test` or `live`, from the key prefix; undefined for anything else. */
export function modeOf(apiKey: string): "test" | "live" | undefined {
  const key = apiKey.trim();
  if (key.startsWith("test_")) return "test";
  if (key.startsWith("live_")) return "live";
  return undefined;
}

/** Publishable keys carry `_pub` after the environment (`test_pub_…`). */
export function isPublishable(apiKey: string): boolean {
  return /^(test|live)_pub/.test(apiKey.trim());
}

/**
 * Pick the credential-liveness probe for a key.
 *
 * A secret key uses `GET /v1/addresses?limit=1`: free, read-only, needs a credential, returns
 * the caller's own address book and nothing that is a credential. (`GET /v1/accounts` would be
 * smaller still, but it is documented only as a Lob Credits balance and could not be proven
 * live without a key; an address-book list is the endpoint every Lob account has.)
 *
 * A publishable key is refused by that endpoint by design, so it is probed with the
 * US-autocomplete call it is allowed to make.
 */
export function probeFor(
  apiKey: string,
): { method: "GET" | "POST"; path: string; body?: unknown } {
  if (isPublishable(apiKey)) {
    return { method: "POST", path: "/us_autocompletions", body: { address_prefix: "1" } };
  }
  return { method: "GET", path: "/addresses?limit=1" };
}

/** Error codes that mean "Lob did not accept this credential". */
export const AUTH_FAILURE_CODES = ["unauthorized", "invalid_api_key"] as const;

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "Paste a secret API key from Lob Dashboard > Settings > API Keys. A `test_…` key sends " +
    "nothing and bills nothing; a `live_…` key prints and mails real, billed pieces. Create " +
    "one Connection per environment. A publishable key (`test_pub_…`) works for the " +
    "verification and autocomplete actions only.",
  connectionLabel: "Lob ({{mode}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Lob Dashboard > Settings > API Keys. Starts with test_ or live_. Used as the HTTP " +
        "Basic username with an empty password.",
    },
  ],

  /** The only hook handed the raw credential; network-less. */
  sign({ request, credential }) {
    for (const [name, value] of Object.entries(authHeaders(credential as Partial<LobCredential>))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<LobCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };
    if (!modeOf(key)) {
      return {
        ok: false,
        message: "That does not look like a Lob API key: keys start with test_ or live_.",
      };
    }

    const probe = probeFor(key);
    const headers: Record<string, string> = {
      accept: "application/json",
      ...authHeaders({ apiKey: key }),
    };
    const init: RequestInit = { method: probe.method, headers };
    if (probe.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(probe.body);
    }
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${probe.path}`, init);
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as
      | { error?: { code?: string; message?: string } }
      | null;
    const code = body?.error?.code;

    if (code === "invalid_api_key") {
      return {
        ok: false,
        message:
          "Lob rejected the key (invalid_api_key). Check it was copied exactly and has not been " +
          "rolled in Lob Dashboard > Settings > API Keys.",
      };
    }
    if (code === "unauthorized") {
      return {
        ok: false,
        message: "Lob received no credential (unauthorized). The key did not reach the request — " +
          "reconnect this connection.",
      };
    }
    // A schema-correct Lob error that is not an auth failure proves the key was accepted:
    // the call was authenticated and then refused on its merits.
    if (code && res.status < 500 && res.status !== 429) return { ok: true };
    if (res.status === 401) {
      return { ok: false, message: "Lob answered 401 with an unrecognised body" };
    }
    return {
      ok: false,
      message: `Could not verify the key: Lob returned HTTP ${res.status}${code ? ` ${code}` : ""}`,
    };
  },

  /** Label the Connection with its environment — derived from the key prefix, no request. */
  afterConnect({ credential }) {
    const mode = modeOf((credential as Partial<LobCredential>)?.apiKey ?? "");
    return { mode: mode ?? "unknown" };
  },
};

export default apiKey;
