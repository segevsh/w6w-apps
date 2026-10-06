import type { AuthDefinition } from "@w6w/types";
import { API_URL, errorText, errorTypes } from "../lib/client.ts";

/**
 * API key — People Data Labs takes `X-Api-Key: <key>` (it also accepts `?api_key=`, which would
 * put the key in URLs and logs, so the header is the only form used). Keys are on the dashboard
 * at https://dashboard.peopledatalabs.com/.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Copy your key from dashboard.peopledatalabs.com. Sent as the `X-Api-Key` header.",
  apiKey: { in: "header", name: "X-Api-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "People Data Labs dashboard → API keys. Calls spend the credits on this key's plan.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as { apiKey: string };
    request.headers["x-api-key"] = key;
    return request;
  },

  /**
   * Probe: `GET /v5/autocomplete?field=title&size=1` — free for every active key, returns
   * suggestions only, never the key. The verdict is read from the BODY: a good key answers 200
   * with a `data` array; a rejected one answers `{status: 401, error: {type:
   * ["authentication_error"], ...}}`. A 402 (credits used up) or 429 (rate limit) comes from a
   * recognised key, so the credential itself is fine.
   */
  async test({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey?: string };
    if (!key) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/v5/autocomplete?field=title&size=1`, {
        headers: { "x-api-key": key, accept: "application/json" },
      });
    } catch (e) {
      return { ok: false, message: `could not reach the People Data Labs API: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: the request probably never reached PDL */ }
    const obj = body && typeof body === "object" ? body as Record<string, unknown> : null;
    const types = errorTypes(obj);

    if (res.ok) {
      return Array.isArray(obj?.data) ? { ok: true } : {
        ok: false,
        message: `unexpected ${res.status} body from GET /v5/autocomplete — no suggestions array`,
      };
    }
    if (types.includes("authentication_error")) {
      return { ok: false, message: errorText(obj, raw) };
    }
    if (res.status === 402 || res.status === 429) {
      if (types.includes("payment_required") || types.includes("rate_limit_error")) {
        return { ok: true };
      }
    }
    if (res.status >= 500) {
      return {
        ok: false,
        message: `People Data Labs is erroring (${res.status}): ${errorText(obj, raw)}`,
      };
    }
    if (types.length === 0) {
      return {
        ok: false,
        message:
          `People Data Labs returned ${res.status} with a non-error body; the request may not have reached the API`,
      };
    }
    return { ok: false, message: errorText(obj, raw) };
  },
};

export default apiKey;
