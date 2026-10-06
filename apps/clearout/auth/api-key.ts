import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { API_BASE, vendorError } from "../lib/client.ts";

/**
 * Clearout API token — `Authorization: Bearer <token>`, applied in `sign`.
 *
 * Verified 2026-10-06 against the vendor's OpenAPI `securitySchemes` (`http` / `bearer`)
 * and the overview page ("Use the token as the `Authorization: Bearer <TOKEN>` header").
 * The overview's own curl example sends the token with NO `Bearer` prefix; the OpenAPI
 * document and the prose both say Bearer, so Bearer is what this sends. (Unauthenticated,
 * the two forms are indistinguishable — both answer code 1000 — so this could not be
 * settled by probing without a live token.)
 *
 * ## Probe: `GET /account/credits`
 *
 * Read-only and free; the body is credit counters, never the token. A rejected token is
 * `401 {"status":"failed","error":{"code":1000,"message":"Invalid API Token, …"}}` and the
 * verdict is read from that code, not from the status alone.
 */
export interface ClearoutCredential {
  apiToken: string;
}

export const PROBE_PATH = "/account/credits";

export function probeRequest(): SignableRequest {
  return {
    url: `${API_BASE}${PROBE_PATH}`,
    method: "GET",
    headers: { accept: "application/json" },
  };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Token",
  description: "A Clearout API token from the developer dashboard " +
    "(app.clearout.io/developer/api/list), sent as a bearer token.",
  connectionLabel: "Clearout",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Clearout > Developer > API > Create API Token.",
    },
  ],

  sign({ request, credential }) {
    const { apiToken } = credential as Partial<ClearoutCredential>;
    request.headers["authorization"] = `Bearer ${(apiToken ?? "").trim()}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiToken } = credential as Partial<ClearoutCredential>;
    if (!(apiToken ?? "").trim()) return { ok: false, message: "credential missing the API token" };

    const request = await apiKey.sign!({ request: probeRequest(), credential }, ctx);
    const res = await ctx.fetch(request.url, { method: request.method, headers: request.headers });
    const raw = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch { /* not JSON */ }
    const err = vendorError(body);

    if (res.ok && (body as { status?: string } | undefined)?.status !== "failed") {
      return { ok: true };
    }
    if (res.status === 401 || err?.code === 1000) {
      return {
        ok: false,
        message: "Clearout rejected the API token (code 1000 Invalid API Token). " +
          "Generate a new one under Developer > API in the Clearout dashboard.",
      };
    }
    if (res.status === 429 || err?.code === 1030) {
      return { ok: false, message: "Clearout rate-limited the token check (429); try again" };
    }
    return {
      ok: false,
      message: `Clearout answered HTTP ${res.status}${
        err?.message ? `: ${err.message}` : ""
      } for ${PROBE_PATH}`,
    };
  },
};

export default apiKey;
