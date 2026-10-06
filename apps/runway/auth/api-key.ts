import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { API_BASE, API_VERSION, vendorMessage } from "../lib/client.ts";

/**
 * Runway API secret — `Authorization: Bearer <key>`, applied in `sign`.
 *
 * Verified 2026-10-06 against the OpenAPI `securitySchemes` (`ApiKeyAuth`: `http` /
 * `bearer`) and by probe: with no header the API answers `401 {"error":"No API key was
 * provided. Be sure to include a Bearer token in the Authorization header."}`, and a token
 * that does not start with `key_` is refused with a 401 saying so. (A syntactically valid
 * but unknown key could not be probed without a live account.)
 *
 * ## Probe: `GET /v1/organization`
 *
 * Read-only and free; the body is the usage tier, credit balance and per-model usage —
 * never the key. It needs no scope. A rejected key is a 401 with an `error` string; the
 * verdict is read from the status AND the body shape (a 2xx must carry `creditBalance`).
 */
export interface RunwayCredential {
  apiKey: string;
}

export const PROBE_PATH = "/v1/organization";

export function probeRequest(): SignableRequest {
  return {
    url: `${API_BASE}${PROBE_PATH}`,
    method: "GET",
    headers: { accept: "application/json", "x-runway-version": API_VERSION },
  };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Secret",
  description: "A Runway API secret from the Developer Portal (dev.runway.com), sent as a " +
    "bearer token. Keys start with `key_`.",
  connectionLabel: "Runway",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiKey",
      label: "API Secret",
      type: "secret",
      required: true,
      hint: "Runway Developer Portal > your organization > API Keys. Starts with key_.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as Partial<RunwayCredential>;
    request.headers["authorization"] = `Bearer ${(apiKey ?? "").trim()}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey: key } = credential as Partial<RunwayCredential>;
    if (!(key ?? "").trim()) return { ok: false, message: "credential missing the API secret" };

    const request = await apiKey.sign!({ request: probeRequest(), credential }, ctx);
    const res = await ctx.fetch(request.url, { method: request.method, headers: request.headers });
    const raw = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch { /* not JSON */ }

    if (
      res.ok && typeof (body as { creditBalance?: unknown } | undefined)?.creditBalance === "number"
    ) {
      return { ok: true };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message: `Runway rejected the API secret${
          vendorMessage(body) ? ` (${vendorMessage(body)})` : ""
        }. Create a new key in the Runway Developer Portal.`,
      };
    }
    if (res.status === 429) {
      return { ok: false, message: "Runway rate-limited the key check (429); try again" };
    }
    return {
      ok: false,
      message: `Runway answered HTTP ${res.status}${
        vendorMessage(body) ? `: ${vendorMessage(body)}` : ""
      } for ${PROBE_PATH}`,
    };
  },
};

export default apiKey;
