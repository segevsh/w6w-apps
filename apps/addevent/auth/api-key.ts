import type { AuthDefinition } from "@w6w/types";
import type { AddEventErrorBody } from "../lib/client.ts";
import { API_BASE } from "../lib/client.ts";

/**
 * AddEvent API key — `Authorization: Bearer <apiKey>`.
 *
 * Verified against AddEvent's OpenAPI 3.1 document (`components.securitySchemes.bearerAuth`,
 * `bearerFormat: "APIkey"`) and its "Authentication" reference page, plus live probes against
 * `api.addevent.com` on 2026-09-15.
 *
 * ## The probe: `GET /calendars?page_size=1`
 *
 * Chosen over the tempting `GET /timezones` (AddEvent's only endpoint with no
 * authentication required at all — the OpenAPI document overrides its security with
 * `security: [{}]`, confirmed live to answer 200 with no Authorization header). A probe
 * against an unauthenticated endpoint would pass a Connection whose credential never
 * reached the request.
 *
 * `GET /calendars` requires a credential, is not scoped to any one resource (AddEvent's API
 * keys are account-wide — there is no documented concept of a scoped key), and its response
 * carries nothing secret: just the account's own calendar objects (title, timezone, stats,
 * public share links). `page_size=1` keeps the probe response small.
 *
 * ## 401 vs 403 — not the same failure
 *
 * Live-confirmed: an invalid or absent key answers `401` with body
 * `{"error_id":"...","error_message":"","error_code":900}`. AddEvent's own response-code
 * reference draws a second, easy-to-miss distinction: **403** means the key itself is fine
 * but the account's plan doesn't include API access (the free Hobby plan is the documented
 * example) or the account has exceeded a usage limit. Both `test` below and every action's
 * error formatting (`lib/client.ts`) keep that distinction rather than collapsing every 4xx
 * into "invalid credential" — a 403 Connection is not broken, it needs a plan upgrade.
 */

export interface AddEventCredential {
  apiKey: string;
}

/** The one place the wire format is built, reused by `sign` and `test`. */
export function authHeaders(credential: Partial<AddEventCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/** See the module doc for why this endpoint and not `/timezones` or a whoami. */
export const PROBE_PATH = "/calendars";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "Paste the API key from your AddEvent account page " +
    "(https://dashboard.addevent.com/account/settings). API access requires a paid AddEvent " +
    "plan — the free Hobby plan does not include it.",
  connectionLabel: "AddEvent",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "From https://dashboard.addevent.com/account/settings. Keep it secret — it carries " +
        "full access to your AddEvent account.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it stamps the
   * bearer header and returns. The key never appears in a URL or query parameter —
   * AddEvent documents only the header form.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<AddEventCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<AddEventCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?page_size=1`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as AddEventErrorBody | null;

    if (res.status === 401) {
      return {
        ok: false,
        message: "AddEvent rejected the API key (401 — no valid API key provided). Check it " +
          "was copied exactly from your AddEvent account settings page." +
          (body?.error_id ? ` (error_id ${body.error_id})` : ""),
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: "AddEvent returned 403 for GET /calendars: the key doesn't have permission " +
          "to perform this request. Check the account's plan includes API access (the free " +
          "Hobby plan does not) and that no usage limit has been exceeded." +
          (body?.error_message ? ` ${body.error_message}` : ""),
      };
    }
    return { ok: false, message: `AddEvent returned HTTP ${res.status} for GET /calendars` };
  },
};

export default apiKey;
