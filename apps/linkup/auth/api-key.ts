import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { API_BASE, errorCode, errorText } from "../lib/client.ts";

/**
 * Linkup API key — `Authorization: Bearer <key>`.
 *
 * Verified 2026-10-06: the OpenAPI document's only security scheme is
 * `{"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}`, applied to every operation.
 * Keys are created in the Linkup dashboard (app.linkup.so).
 *
 * ## Probe: `GET /v1/credits/balance`
 *
 * It needs a valid key, spends no credit, and answers `{"balance": <number>}` — the account's
 * own balance, not the credential. The verdict is read from the BODY: a `balance` number is a
 * live key; a refusal is recognised by the vendor's own `error.code` (`UNAUTHORIZED`) and not by
 * the status alone. An unauthenticated call answers
 * `401 {"statusCode":401,"error":{"code":"UNAUTHORIZED","details":[],"message":"Unauthorized action"}}`
 * (the same for a missing and a bogus key, measured), whereas `/search` and `/fetch` answer `402`
 * (x402 payment details) when no key is sent at all — so those two are poor probes.
 */
export interface LinkupCredential {
  apiKey: string;
}

export const BALANCE_PATH = "/v1/credits/balance";

export function probeRequest(): SignableRequest {
  return {
    url: `${API_BASE}${BALANCE_PATH}`,
    method: "GET",
    headers: { accept: "application/json" },
  };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "A Linkup API key from the dashboard (app.linkup.so), sent as a Bearer token.",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Create one in the Linkup dashboard under API keys.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as Partial<LinkupCredential>;
    request.headers["authorization"] = `Bearer ${(apiKey ?? "").trim()}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey: key } = credential as Partial<LinkupCredential>;
    if (!(key ?? "").trim()) return { ok: false, message: "credential missing the API key" };

    const request = await apiKey.sign!({ request: probeRequest(), credential }, ctx);
    const res = await ctx.fetch(request.url, { method: request.method, headers: request.headers });
    const raw = await res.text().catch(() => "");

    if (res.ok) {
      let balance: unknown;
      try {
        balance = (JSON.parse(raw) as { balance?: unknown }).balance;
      } catch { /* not JSON */ }
      return typeof balance === "number"
        ? { ok: true }
        : { ok: false, message: `Linkup answered ${res.status} but not with a credit balance` };
    }
    if (errorCode(raw) === "UNAUTHORIZED" || res.status === 401) {
      return {
        ok: false,
        message: `Linkup rejected the API key (${res.status}). Check it was copied exactly and ` +
          "has not been revoked.",
      };
    }
    if (res.status === 429) {
      return { ok: false, message: "Linkup rate-limited the key check (429); try again" };
    }
    const text = errorText(raw);
    return {
      ok: false,
      message: `Linkup answered HTTP ${res.status}${text ? `: ${text}` : ""} for ${BALANCE_PATH}`,
    };
  },
};

export default apiKey;
