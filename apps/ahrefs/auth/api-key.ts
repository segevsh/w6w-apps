import type { AuthDefinition, SignableRequest } from "@w6w/types";
import { API_BASE, errorLabel } from "../lib/client.ts";

/**
 * Ahrefs API key — `Authorization: Bearer <key>`, applied in `sign`.
 *
 * Verified 2026-10-06 against the OpenAPI `securitySchemes` (`http`, scheme `bearer`) and
 * `docs.ahrefs.com/llms.txt` ("send your API key as a bearer token"). Keys are created by a
 * workspace owner/admin under Account settings > API keys.
 *
 * ## Probe: `GET /subscription-info/limits-and-usage`
 *
 * Free (consumes no units), needs no target, and returns `limits_and_usage` —
 * `subscription`, `units_limit_*`, `units_usage_*`, `usage_reset_date`, `api_key_expiration_date`.
 * It never contains the key. Measured unauthenticated: no key is HTTP 403 `["Error","Forbidden"]`,
 * a bad key HTTP 401 `["Error","Unauthorized"]`. A key without API access can also be 403, so
 * the verdict is read from the body: success needs `limits_and_usage` in it.
 */
export interface AhrefsCredential {
  apiKey: string;
}

export const PROBE_PATH = "/subscription-info/limits-and-usage";

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
  displayName: "API Key",
  description: "An Ahrefs API v3 key, sent as a bearer token.",
  connectionLabel: "Ahrefs ({{subscription}})",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiKey",
      label: "API key",
      type: "secret",
      required: true,
      hint: "Ahrefs > Account settings > API keys > Create API key (workspace owners and admins).",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as Partial<AhrefsCredential>;
    request.headers["authorization"] = `Bearer ${(key ?? "").trim()}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey: key } = credential as Partial<AhrefsCredential>;
    if (!(key ?? "").trim()) return { ok: false, message: "credential missing the API key" };

    const request = await apiKey.sign!({ request: probeRequest(), credential }, ctx);
    let res: Response;
    try {
      res = await ctx.fetch(request.url, { method: request.method, headers: request.headers });
    } catch (e) {
      return { ok: false, message: `could not reach the Ahrefs API: ${e}` };
    }
    const raw = await res.text().catch(() => "");
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch { /* not JSON */ }

    const usage = (body as { limits_and_usage?: unknown } | undefined)?.limits_and_usage;
    if (res.ok) {
      return usage && typeof usage === "object" ? { ok: true } : {
        ok: false,
        message: `unexpected ${res.status} body from limits-and-usage — no limits_and_usage in it`,
      };
    }
    const label = errorLabel(body);
    if (res.status === 429) {
      return { ok: false, message: "Ahrefs rate-limited the key check (429); try again" };
    }
    if (res.status >= 500) return { ok: false, message: `Ahrefs is erroring (HTTP ${res.status})` };
    if (label === "Unauthorized" || label === "Forbidden") {
      return {
        ok: false,
        message: `Ahrefs rejected the API key (${label}). Check the key is current and that ` +
          "the plan includes API access.",
      };
    }
    return {
      ok: false,
      message: `Ahrefs answered HTTP ${res.status}${label ? ` (${label})` : ""} for ${PROBE_PATH}`,
    };
  },

  /** Records the plan name for the connection label. */
  async afterConnect({ credential }, ctx) {
    let subscription = "Ahrefs";
    try {
      const request = await apiKey.sign!({ request: probeRequest(), credential }, ctx);
      const res = await ctx.fetch(request.url, {
        method: request.method,
        headers: request.headers,
      });
      if (res.ok) {
        const body = await res.json() as { limits_and_usage?: { subscription?: string } };
        subscription = body.limits_and_usage?.subscription || subscription;
      }
    } catch { /* the label falls back to "Ahrefs" */ }
    return { subscription };
  },
};

export default apiKey;
