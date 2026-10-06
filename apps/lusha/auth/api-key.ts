import type { AuthDefinition } from "@w6w/types";
import { API_BASE, errorText } from "../lib/client.ts";

interface StoredCredential {
  apiKey: string;
}

/**
 * API key — sent as the `api_key` request header (documented as the `ApiKeyAuth` scheme of the
 * OpenAPI document). Keys are UUIDs, created in the Lusha dashboard under API settings.
 *
 * Probe: `GET /v3/account/usage` — credits, rate-limit windows and plan; never the key (the body
 * has `credits`, `rateLimits`, `plan`, `pricing`). Measured 2026-10-06 the verdict must be read from
 * the BODY: a malformed key is a 400 "Invalid API key format", a well-formed wrong key a 401
 * "Invalid API key", and no header at all a 401 `{error: "invalid_request"}`. A 2xx counts only
 * when it carries the `credits` object. The endpoint is limited to 5 requests/minute.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Create a key in the Lusha dashboard under API settings. Sent as the `api_key` header.",
  connectionLabel: "Lusha ({{plan}})",
  apiKey: { in: "header", name: "api_key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "A UUID from the Lusha dashboard under API settings.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as StoredCredential;
    request.headers["api_key"] = apiKey;
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<StoredCredential>;
    if (!cred.apiKey) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}/v3/account/usage`, {
        headers: { api_key: cred.apiKey, accept: "application/json" },
      });
    } catch (e) {
      return { ok: false, message: `could not reach the Lusha API: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: the request probably never reached Lusha */ }

    if (res.ok) {
      return typeof (body as { credits?: unknown } | null)?.credits === "object"
        ? { ok: true }
        : { ok: false, message: `unexpected ${res.status} body from GET /v3/account/usage` };
    }
    const b = body as { statusCode?: unknown; error?: unknown } | null;
    if (typeof b?.statusCode !== "number" && typeof b?.error !== "string") {
      return {
        ok: false,
        message:
          `Lusha returned ${res.status} with a non-error body; the request may not have reached the API`,
      };
    }
    const text = errorText(body, raw);
    if (res.status >= 500) {
      return { ok: false, message: `Lusha is erroring (${res.status}): ${text}` };
    }
    if (res.status === 429) {
      return { ok: false, message: `Lusha rate-limited the check (5 requests/minute): ${text}` };
    }
    return { ok: false, message: text };
  },

  /** Records the plan category, used in the connection label. */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<StoredCredential>;
    let plan = "API";
    try {
      const res = await ctx.fetch(`${API_BASE}/v3/account/usage`, {
        headers: { api_key: cred.apiKey ?? "", accept: "application/json" },
      });
      if (res.ok) {
        const body = await res.json() as { plan?: { category?: string } };
        if (body.plan?.category) plan = body.plan.category;
      }
    } catch { /* the label falls back to "API" */ }
    return { plan };
  },
};

export default apiKey;
