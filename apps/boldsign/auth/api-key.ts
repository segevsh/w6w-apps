import type { AuthDefinition } from "@w6w/types";
import { API_HOSTS, type BoldSignError, messageFrom } from "../lib/client.ts";

interface StoredCredential {
  apiHost: string;
  apiKey: string;
}

/**
 * `X-API-KEY: <key>` — BoldSign's own basic authentication mechanism
 * (`authentication/api-key`), an alternative to OAuth2 for a server-to-server
 * integration. Generated from the BoldSign app's API > API Key page; by
 * default it carries every scope (not customizable per the same doc).
 *
 * `apiHost` is collected alongside the key because BoldSign accounts (and the
 * keys they issue) are region-sharded — see `lib/client.ts`.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "From BoldSign's app: API menu > API Key > Generate API Key. Carries every scope by default.",
  connectionLabel: "BoldSign ({{apiHost}})",
  apiKey: { in: "header", name: "X-API-KEY" },
  fields: [
    {
      key: "apiHost",
      label: "API Region",
      type: "select",
      required: true,
      default: API_HOSTS.us,
      options: [
        { value: API_HOSTS.us, label: "United States (api.boldsign.com)" },
        { value: API_HOSTS.eu, label: "Europe (api-eu.boldsign.com)" },
        { value: API_HOSTS.ca, label: "Canada (api-ca.boldsign.com)" },
        { value: API_HOSTS.au, label: "Australia (api-au.boldsign.com)" },
      ],
      hint: "The region your BoldSign account was created in. A key only works against its own " +
        "account's region — using the wrong one answers with an ordinary invalid-credential error.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "BoldSign app > API > API Key > Generate API Key.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as StoredCredential;
    request.headers["x-api-key"] = key;
    return request;
  },

  /**
   * `GET /v1/plan/apiCreditsCount` — the account's purchased API-credit
   * balance. Chosen over `GET /v1/document/list` (which needs no extra scope
   * either, since a generated key carries all of them, but returns actual
   * document data — sender/recipient names and emails — that a liveness probe
   * has no reason to fetch) and over any document/template list, for the same
   * reason `apify`'s `/users/me/limits` beats its own `/users/me`: account
   * metadata, no resource scope, no data that wasn't already the caller's.
   *
   * A bad or missing key answers **401 with an empty body** (verified live
   * 2026-09-15 — see `lib/client.ts`'s module doc), so this reads the body
   * only when BoldSign actually sent one.
   */
  async test({ credential }, ctx) {
    const { apiHost, apiKey: key } = credential as Partial<StoredCredential>;
    if (!key) return { ok: false, message: "credential missing apiKey" };
    const host = apiHost || API_HOSTS.us;
    const res = await ctx.fetch(`https://${host}/v1/plan/apiCreditsCount`, {
      headers: { "x-api-key": key, accept: "application/json" },
    });
    if (res.ok) {
      await res.body?.cancel();
      return { ok: true };
    }
    const text = await res.text().catch(() => "");
    let parsed: BoldSignError | undefined;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        // Non-JSON body — fall through to the status-based message.
      }
    }
    const detail = messageFrom(parsed);
    return {
      ok: false,
      message: detail
        ? `BoldSign rejected the key: ${detail}`
        : `BoldSign ${host} returned ${res.status} for the credit-balance check` +
          (res.status === 401 ? " (invalid API key, or the wrong API Region)" : ""),
    };
  },

  /**
   * Records the chosen `apiHost` on the Connection's redacted `display` — the
   * ONLY place a non-secret field survives past connect time (per
   * `rfcs/connection.md`, `display` is populated exclusively by
   * `afterConnect`; a `fields` entry does not propagate there on its own).
   * `lib/client.ts`'s `apiHostFrom` and `health/service.ts` both depend on
   * this to build requests / pick a status component for the right region.
   */
  afterConnect({ credential }) {
    const { apiHost } = credential as Partial<StoredCredential>;
    return { apiHost: apiHost || API_HOSTS.us };
  },
};

export default apiKey;
