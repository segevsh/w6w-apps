import type { AuthDefinition } from "@w6w/types";
import { API_URL, errorText } from "../lib/client.ts";

/**
 * API key — Findymail takes `Authorization: Bearer <token>`; the token is created on the
 * dashboard's API page (https://app.findymail.com/user/api-tokens).
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Create a token at app.findymail.com → API (user/api-tokens). Sent as `Authorization: Bearer <token>`.",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "app.findymail.com → API page. The token belongs to your user and spends your credits.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${key}`;
    return request;
  },

  /**
   * Probe: `GET /api/credits` — the credit balances `{ credits, verifier_credits }`, free, never
   * the key. The verdict is read from the BODY: a good key answers a JSON object carrying numeric
   * `credits`; a rejected one answers `{"message":"Unauthenticated."}` (401). A 423 `{error}`
   * ("Subscription is paused") comes from a recognised account, so the credential itself is fine.
   */
  async test({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey?: string };
    if (!key) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/api/credits`, {
        headers: { authorization: `Bearer ${key}`, accept: "application/json" },
      });
    } catch (e) {
      return { ok: false, message: `could not reach the Findymail API: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: the request probably never reached Findymail */ }
    const obj = body && typeof body === "object" ? body as Record<string, unknown> : null;

    if (res.ok) {
      return typeof obj?.credits === "number" ? { ok: true } : {
        ok: false,
        message: `unexpected ${res.status} body from GET /api/credits — no credits balance`,
      };
    }
    if (res.status === 423 && typeof obj?.error === "string") return { ok: true };
    if (res.status >= 500) {
      return {
        ok: false,
        message: `Findymail is erroring (${res.status}): ${errorText(obj, raw)}`,
      };
    }
    if (!obj || (typeof obj.message !== "string" && typeof obj.error !== "string")) {
      return {
        ok: false,
        message:
          `Findymail returned ${res.status} with a non-error body; the request may not have reached the API`,
      };
    }
    return { ok: false, message: errorText(obj, raw) || `Findymail returned ${res.status}` };
  },
};

export default apiKey;
