import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { API_BASE, errorCode, errorText } from "../lib/client.ts";

/**
 * RocketReach API key — the `Api-Key` request header, applied in `sign`.
 *
 * Verified 2026-10-06 against the vendor's OpenAPI `securitySchemes`
 * (`RocketReachAPIKey`: apiKey, header, `Api-Key`; the older `api_key` query
 * parameter is documented as deprecated and is not used) and live probes of
 * `api.rocketreach.co`.
 *
 * ## Probe: `GET /account/`
 *
 * The connected user's name, email, credit usage and rate limits; per the published
 * schema it carries no key. NOT `GET /universal/account/`, whose response includes
 * `api_key`. A missing key and a wrong key are both `401` with
 * `{"detail": …, "error_code": "authentication_failed"}` and differ only in `detail`
 * (`Anonymous requests are not allowed…` vs `Invalid API key`), so the verdict is
 * `res.ok` plus an account-shaped body, and the message comes from the body.
 */
export interface RocketReachCredential {
  apiKey: string;
}

export const ACCOUNT_PATH = "/account/";

export function probeRequest(): SignableRequest {
  return {
    url: `${API_BASE}${ACCOUNT_PATH}`,
    method: "GET",
    headers: { accept: "application/json" },
  };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "A RocketReach API key (rocketreach.co/account, API Usage & Settings > " +
    "Generate New API Key), sent in the Api-Key header.",
  connectionLabel: "RocketReach",
  apiKey: { in: "header", name: "Api-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "rocketreach.co/account > API Usage & Settings > Generate New API Key.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as Partial<RocketReachCredential>;
    request.headers["api-key"] = (key ?? "").trim();
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey: key } = credential as Partial<RocketReachCredential>;
    if (!(key ?? "").trim()) return { ok: false, message: "credential missing the API key" };

    const request = await apiKey.sign!({ request: probeRequest(), credential }, ctx);
    const res = await ctx.fetch(request.url, { method: request.method, headers: request.headers });
    const raw = await res.text().catch(() => "");

    if (res.ok) {
      let account: Record<string, unknown> | null = null;
      try {
        account = JSON.parse(raw);
      } catch { /* not JSON */ }
      return typeof account?.id === "number"
        ? { ok: true }
        : { ok: false, message: "RocketReach answered 200 with a body that is not an account" };
    }

    const text = errorText(raw);
    const code = errorCode(raw);
    if (res.status === 401 || code === "authentication_failed") {
      return {
        ok: false,
        message: `RocketReach rejected the API key (${res.status}${text ? ` ${text}` : ""}). ` +
          "Check it was copied exactly from rocketreach.co/account and has not been regenerated.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `RocketReach refused the key's access to ${ACCOUNT_PATH} (403${
          text ? ` ${text}` : ""
        })`,
      };
    }
    if (res.status === 429) {
      return { ok: false, message: "RocketReach rate-limited the key check (429); try again" };
    }
    return {
      ok: false,
      message: `RocketReach answered HTTP ${res.status}${
        text ? `: ${text}` : ""
      } for ${ACCOUNT_PATH}`,
    };
  },
};

export default apiKey;
