import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, type Envelope, errorText } from "../lib/client.ts";

/**
 * Webconnex API key — `apiKey: <key>` request header.
 *
 * The reference documents one scheme: a key issued from the Integrations pane under account
 * settings, sent in the `apiKey` header on every request. There is no OAuth surface.
 *
 * ## The probe is `GET /forms?limit=1`, not `/ping`
 *
 * `GET /ping` is the vendor's "healthcheck" and it is PUBLIC: measured 2026-10-06 it answers
 * `200 {"responseCode":200,"data":"Some nights I always win..."}` with no key, and the same
 * with `apiKey: bogus`. A connection whose key never reached the request would pass it.
 * `/forms` needs a key (unauthenticated: `401`, `error.code` 4401) and the product query
 * parameter is optional there, so a key is not required to belong to a particular product.
 * The response is a list of forms and carries no credential.
 *
 * ## The status is not the verdict
 *
 * A missing key is `401 {"error":{"code":4401,"description":"apiKey is missing from request
 * header"}}`, but a WRONG key is `404 {"error":{"code":4404,"description":"invalid apiKey"}}` —
 * the same status as an unknown route. A pass is therefore the documented `data` array, and a
 * rejection is recognised from the vendor's own `description`, with 401/403 as a hint.
 */
export interface RegfoxCredential {
  apiKey: string;
}

export const PROBE_PATH = "/forms?limit=1";

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<RegfoxCredential>): Record<string, string> {
  return { apiKey: (credential.apiKey ?? "").trim() };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "A Webconnex API key from your account's Integrations settings. It works for " +
    "RegFox, and for TicketSpice, RedPodium and GivingFuel on the same account.",
  connectionLabel: "RegFox",
  apiKey: { in: "header", name: "apiKey" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Create one under Account Settings > Integrations in your RegFox account.",
    },
  ],

  /** The only hook handed the raw credential; network-less, it stamps the header. */
  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<RegfoxCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<RegfoxCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    const body = await res.json().catch(() => null) as Envelope | null;

    if (res.ok && body?.responseCode === 200 && Array.isArray(body.data)) return { ok: true };

    const detail = errorText(body);
    const code = body?.error?.code;
    if (
      res.status === 401 || res.status === 403 || code === 4401 ||
      /api ?key/i.test(detail ?? "")
    ) {
      return {
        ok: false,
        message: `RegFox rejected the API key (HTTP ${res.status}${
          detail ? ` — ${detail}` : ""
        }). Check it was copied exactly and has not been deleted.`,
      };
    }
    return {
      ok: false,
      message: `RegFox returned an unexpected response (HTTP ${res.status})${
        detail ? `: ${detail}` : ""
      }`,
    };
  },
};

export default apiKey;
