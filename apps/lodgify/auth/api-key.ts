import type { AuthDefinition } from "@w6w/types";
import { API_BASE, failureMessage } from "../lib/client.ts";

/**
 * Lodgify API key — `X-ApiKey: <key>`.
 *
 * The OpenAPI `components.securitySchemes` block (fetched 2026-10-05) declares exactly
 * one scheme: `ApiKey`, `type: apiKey`, `in: header`, `name: X-ApiKey`.
 *
 * ## The probe
 *
 * `GET /v2/properties?size=1` — the properties list is the cheapest read every Lodgify
 * account can make, it needs no scope (a key is account-wide), and its response is a
 * `{count, items}` page of property summaries with no credential material in it.
 *
 * Two endpoints that look like better probes were measured live on 2026-10-05 and
 * rejected: `GET /v1/countries` and `GET /v1/currencies` answer **200 with no key at
 * all**, so a connection whose key never reached the request would pass a probe against
 * them.
 *
 * ## Classifying a rejected key
 *
 * The vendor's error object (`{message, code, correlation_id, event_id}`, e.g.
 * `Authorization has been denied for this request.`, code 999) is the documented
 * discriminator, but a missing or bogus key measured live answered `403` with an
 * EMPTY body — so for the rejection case there is no body to read, and the only signal
 * is the 401/403 status. That is the one place this app classifies from a status code,
 * and only because it is the sole signal; success is decided by the body (a `items`
 * array), never by the status alone.
 */

export interface LodgifyCredential {
  apiKey: string;
}

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<LodgifyCredential>): Record<string, string> {
  return { "x-apikey": credential.apiKey ?? "" };
}

export const PROBE_PATH = "/v2/properties?size=1";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste your Lodgify Public API key (Lodgify > Settings > Public API). It is sent in the " +
    "X-ApiKey header and grants access to the whole account.",
  connectionLabel: "Lodgify",
  apiKey: { in: "header", name: "X-ApiKey" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "From Lodgify > Settings > Public API. Keep it secret: it carries full access to " +
        "your Lodgify account.",
    },
  ],

  sign({ request, credential }) {
    const cred = credential as Partial<LodgifyCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<LodgifyCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    const text = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = undefined;
    }

    if (res.ok && Array.isArray((body as { items?: unknown } | undefined)?.items)) {
      return { ok: true };
    }
    if (res.status === 401 || res.status === 403) {
      const detail = failureMessage(body);
      return {
        ok: false,
        message: `Lodgify rejected the API key (${res.status}${detail ? `: ${detail}` : ""}). ` +
          "Check it was copied exactly from Lodgify > Settings > Public API.",
      };
    }
    if (res.ok) {
      return {
        ok: false,
        message: "Lodgify answered 200 to GET /v2/properties but not with a property page, so " +
          "the key could not be confirmed.",
      };
    }
    return {
      ok: false,
      message: `Lodgify returned HTTP ${res.status} for GET /v2/properties` +
        `${failureMessage(body) ? `: ${failureMessage(body)}` : ""}`,
    };
  },
};

export default apiKey;
