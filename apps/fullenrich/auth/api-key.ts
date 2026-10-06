import type { AuthDefinition } from "@w6w/types";
import { API_URL, type FullEnrichErrorBody } from "../lib/client.ts";

/**
 * API key — FullEnrich takes `Authorization: Bearer <key>`. A key belongs to one
 * workspace and may carry a consumption limit.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Copy the key from app.fullenrich.com → API. Sent as `Authorization: Bearer <key>`. A key belongs to one workspace and can have a credit consumption limit.",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "app.fullenrich.com/app/api. Regenerating the key there invalidates the old one.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${key}`;
    return request;
  },

  /**
   * Probe: `GET /account/keys/verify`, the documented key check. It answers
   * `{ workspace_id }` — an id, never the key. The verdict is read from the
   * BODY: a 200 must carry `workspace_id`; failures carry the vendor's own
   * `{code, message}` (`error.api.key` for an unknown key,
   * `error.authorization.not_set` for a missing header).
   */
  async test({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey?: string };
    if (!key) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/account/keys/verify`, {
        headers: { authorization: `Bearer ${key}`, accept: "application/json" },
      });
    } catch (e) {
      return { ok: false, message: `could not reach the FullEnrich API: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: the request probably never reached FullEnrich */ }
    const obj = (body ?? {}) as FullEnrichErrorBody & { workspace_id?: string };

    if (res.ok) {
      return typeof obj.workspace_id === "string" ? { ok: true } : {
        ok: false,
        message: `unexpected ${res.status} body from GET /account/keys/verify — no workspace_id`,
      };
    }
    if (typeof obj.code !== "string") {
      return {
        ok: false,
        message:
          `FullEnrich returned ${res.status} with a non-error body; the request may not have reached the API`,
      };
    }
    return { ok: false, message: obj.message ?? obj.code };
  },
};

export default apiKey;
