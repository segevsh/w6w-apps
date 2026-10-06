import type { AuthDefinition } from "@w6w/types";
import { API_URL, type EnrichLayerErrorBody } from "../lib/client.ts";

/** API key — Enrich Layer takes `Authorization: Bearer <key>` on every v2 endpoint. */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Create a key in your Enrich Layer dashboard (enrichlayer.com). Sent as `Authorization: Bearer <key>`. New accounts start with 500 free credits.",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint:
        "From the Enrich Layer dashboard. Every billable call spends credits from this account.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${key}`;
    return request;
  },

  /**
   * Probe: `GET /credit-balance`, the documented free (0-credit) call. It answers
   * `{ credit_balance }` — a number, never the key. The verdict is read from the BODY: a
   * 200 must carry a numeric `credit_balance`; a rejected key carries the vendor's
   * `{code, description, name}` envelope (measured: HTTP 401
   * `{"code":401,"description":"Invalid API key","name":"Unauthorized"}`).
   */
  async test({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey?: string };
    if (!key) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/credit-balance`, {
        headers: { authorization: `Bearer ${key}`, accept: "application/json" },
      });
    } catch (e) {
      return { ok: false, message: `could not reach the Enrich Layer API: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: the request probably never reached Enrich Layer */ }
    const obj = (body ?? {}) as EnrichLayerErrorBody & { credit_balance?: unknown };

    if (res.ok) {
      return typeof obj.credit_balance === "number" ? { ok: true } : {
        ok: false,
        message: `unexpected ${res.status} body from GET /credit-balance — no credit_balance`,
      };
    }
    if (typeof obj.description !== "string" && typeof obj.name !== "string") {
      return {
        ok: false,
        message:
          `Enrich Layer returned ${res.status} with a non-error body; the request may not have reached the API`,
      };
    }
    return { ok: false, message: obj.description ?? obj.name };
  },
};

export default apiKey;
