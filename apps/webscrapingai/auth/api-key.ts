import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { API_BASE, errorText } from "../lib/client.ts";

/**
 * WebScraping.AI API key — sent as the `api_key` QUERY parameter (the vendor's OpenAPI
 * `securitySchemes.api_key`: `type: apiKey, in: query, name: api_key`). Verified 2026-10-06.
 *
 * ## Probe: `GET /account`
 *
 * It needs a valid key and returns `{ email, remaining_*_credits, resets_at, remaining_concurrency }`
 * — the account email, never the key. Measured live: with no key, and with a wrong key, the answer
 * is the same HTTP 403 `{"message":"Wrong API key."}`. The vendor does not document `/account` as
 * billed.
 *
 * The verdict comes from the body: a 2xx must carry the documented credit counters to count as
 * live; a rejection is recognised from the vendor's own `Wrong API key` message (status 403 is the
 * hint). A 402 ("quota exceeded") is a key the vendor accepted, so the connection is valid.
 */
export interface WsaiCredential {
  apiKey: string;
}

export const ACCOUNT_PATH = "/account";

export function probeRequest(): SignableRequest {
  return {
    url: `${API_BASE}${ACCOUNT_PATH}`,
    method: "GET",
    headers: { accept: "application/json" },
  };
}

const REJECTED = /wrong api key|invalid api key|missing api key/i;

const apiKeyAuth: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "An API key from the WebScraping.AI dashboard (webscraping.ai/dashboard). It is sent as the " +
    "`api_key` query parameter on every request.",
  connectionLabel: "WebScraping.AI",
  apiKey: { in: "query", name: "api_key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint:
        "Copy it from the WebScraping.AI dashboard. Every call spends credits from this account.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as Partial<WsaiCredential>;
    const url = new URL(request.url);
    url.searchParams.set("api_key", (apiKey ?? "").trim());
    request.url = url.toString();
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as Partial<WsaiCredential>;
    if (!(apiKey ?? "").trim()) return { ok: false, message: "credential missing the API key" };

    const request = await apiKeyAuth.sign!({ request: probeRequest(), credential }, ctx);
    const res = await ctx.fetch(request.url, { method: request.method, headers: request.headers });
    const text = await res.text().catch(() => "");
    let body: Record<string, unknown> | null = null;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }

    const message = typeof body?.message === "string" ? body.message : "";
    if (res.ok && typeof body?.remaining_total_credits === "number") return { ok: true };
    if (REJECTED.test(message) || res.status === 403) {
      return {
        ok: false,
        message: `WebScraping.AI rejected the API key (${res.status}${
          message ? ` ${message}` : ""
        }). Check it was copied exactly from the dashboard.`,
      };
    }
    if (res.status === 402) {
      return { ok: true, message: "Key accepted, but the account is out of API credits" };
    }
    if (res.status === 429) {
      return { ok: false, message: "WebScraping.AI rate-limited the key check (429); try again" };
    }
    return {
      ok: false,
      message: res.ok
        ? `WebScraping.AI answered ${res.status} for ${ACCOUNT_PATH} without credit counters`
        : `WebScraping.AI answered HTTP ${res.status} for ${ACCOUNT_PATH}: ${errorText(text)}`,
    };
  },
};

export default apiKeyAuth;
