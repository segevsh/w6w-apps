import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { BULK_HOST, SINGLE_HOST } from "../lib/client.ts";

/**
 * MillionVerifier API key — a query parameter, applied in `sign`, named per host.
 *
 * Verified 2026-10-06 against the vendor's OpenAPI document and live probes: the single
 * API (`api.millionverifier.com`) reads `?api=<key>`, the bulk API
 * (`bulkapi.millionverifier.com`) reads `?key=<key>`. Sending the wrong name is
 * indistinguishable from sending none (`No apikey specified` / `empty_api_key`), so `sign`
 * picks by hostname. There is no header form.
 *
 * ## Probe: `GET /api/v3/credits`
 *
 * Read-only and free; the body is `{credits, bulk_credits, renewing_credits, plan}`, never
 * the key. EVERY answer is HTTP 200 (a wrong key too: `{"result":"error","error":
 * "apikey_not_found"}`), so the verdict is read from the body: a numeric `credits` is a
 * pass, `error` is a failure, and the status code is only a hint.
 */
export interface MillionVerifierCredential {
  apiKey: string;
}

export const PROBE_URL = `https://${SINGLE_HOST}/api/v3/credits`;

export function probeRequest(): SignableRequest {
  return { url: PROBE_URL, method: "GET", headers: { accept: "application/json" } };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "A MillionVerifier API key from app.millionverifier.com/api, sent as the `api` " +
    "(single) or `key` (bulk) query parameter.",
  connectionLabel: "MillionVerifier",
  apiKey: { in: "query", name: "api" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "MillionVerifier > API (app.millionverifier.com/api).",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as Partial<MillionVerifierCredential>;
    const url = new URL(request.url);
    url.searchParams.set(url.hostname === BULK_HOST ? "key" : "api", (apiKey ?? "").trim());
    request.url = url.toString();
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey: k } = credential as Partial<MillionVerifierCredential>;
    if (!(k ?? "").trim()) return { ok: false, message: "credential missing the API key" };

    const request = await apiKey.sign!({ request: probeRequest(), credential }, ctx);
    const res = await ctx.fetch(request.url, { method: request.method, headers: request.headers });
    const raw = await res.text().catch(() => "");
    let body: { credits?: unknown; error?: unknown } | undefined;
    try {
      body = JSON.parse(raw);
    } catch { /* not JSON */ }

    if (body && typeof body.error === "string" && body.error !== "") {
      if (/apikey|api key|api_key/i.test(body.error)) {
        return {
          ok: false,
          message: `MillionVerifier rejected the API key (${body.error}). ` +
            "Copy it again from app.millionverifier.com/api.",
        };
      }
      return { ok: false, message: `MillionVerifier answered an error: ${body.error}` };
    }
    if (res.ok && typeof body?.credits === "number") return { ok: true };
    return {
      ok: false,
      message:
        `MillionVerifier answered HTTP ${res.status} without a credits figure for /api/v3/credits`,
    };
  },
};

export default apiKey;
