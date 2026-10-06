import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { API_BASE, errorText, isErrorEnvelope } from "../lib/client.ts";

/**
 * Supadata API key — sent in the `x-api-key` header (the vendor's OpenAPI
 * `securitySchemes.apiKeyAuth`: `type: apiKey, in: header, name: x-api-key`). Verified 2026-10-06.
 *
 * ## Probe: `GET /v1/me`
 *
 * It needs a valid key, returns only `{ organizationId, plan, maxCredits, usedCredits }` (never the
 * key), costs no credit, and — per the vendor's rate-limit docs — is exempt from the rate limit.
 * Measured against the live API: no key answers 401 `{"error":"unauthorized","details":"Missing API
 * Key"}`, a wrong key answers 401 `{"error":"unauthorized","details":"Invalid API Key: <key>"}`.
 * **The vendor's `details` echoes the submitted key**, so a rejection message here never quotes
 * `details`; it names the vendor's error code only.
 *
 * The verdict is classified from the body's `error` code (`unauthorized`/`forbidden`), with the
 * status as a hint, and a 2xx must carry the documented `organizationId` to count as live.
 */
export interface SupadataCredential {
  apiKey: string;
}

export const ME_PATH = "/me";

export function probeRequest(): SignableRequest {
  return { url: `${API_BASE}${ME_PATH}`, method: "GET", headers: { accept: "application/json" } };
}

const apiKeyAuth: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "An API key from the Supadata dashboard (dash.supadata.ai). It is sent as the `x-api-key` " +
    "header on every request.",
  connectionLabel: "Supadata",
  apiKey: { in: "header", name: "x-api-key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Copy it from the Supadata dashboard. Every call spends credits from this account.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as Partial<SupadataCredential>;
    request.headers["x-api-key"] = (apiKey ?? "").trim();
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as Partial<SupadataCredential>;
    if (!(apiKey ?? "").trim()) return { ok: false, message: "credential missing the API key" };

    const request = await apiKeyAuth.sign!({ request: probeRequest(), credential }, ctx);
    const res = await ctx.fetch(request.url, { method: request.method, headers: request.headers });
    const text = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }

    if (res.ok && (body as { organizationId?: unknown } | null)?.organizationId) {
      return { ok: true };
    }
    const code = isErrorEnvelope(body) ? body.error : undefined;
    if (
      res.status === 401 || res.status === 403 || code === "unauthorized" || code === "forbidden"
    ) {
      return {
        ok: false,
        message: `Supadata rejected the API key (${res.status}${code ? ` ${code}` : ""}). ` +
          "Check it was copied exactly from the dashboard and has not been regenerated.",
      };
    }
    if (res.status === 429) {
      return { ok: false, message: "Supadata rate-limited the key check (429); try again" };
    }
    return {
      ok: false,
      message: res.ok
        ? `Supadata answered ${res.status} for ${ME_PATH} without an account document`
        : `Supadata answered HTTP ${res.status} for ${ME_PATH}: ${
          errorText(text).replace(/Invalid API Key:.*/i, "Invalid API Key")
        }`,
    };
  },
};

export default apiKeyAuth;
