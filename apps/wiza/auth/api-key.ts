import type { AuthDefinition } from "@w6w/types";
import { API_URL, codeOf, messageOf, type WizaBody } from "../lib/client.ts";

/**
 * API key — Wiza takes it as `Authorization: Bearer <key>`. Generate one under Settings → API
 * in the Wiza dashboard (https://wiza.co/app/settings/api).
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Create a key in Wiza under Settings → API. Sent as `Authorization: Bearer <key>`.",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Wiza → Settings → API → generate an API key.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${key}`;
    return request;
  },

  /**
   * Probe: `GET /api/meta/credits` — the credit balance, never the key. A missing and a wrong
   * key are byte-identical (`401 {"status":{"code":401,"message":"Invalid API key."}}`,
   * measured 2026-10-06), so the verdict is the documented `credits` object on success, and
   * the vendor's own `status.code` / message on a refusal, never the HTTP status alone.
   */
  async test({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey?: string };
    if (!key) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/api/meta/credits`, {
        headers: { authorization: `Bearer ${key}`, accept: "application/json" },
      });
    } catch (e) {
      return { ok: false, message: `could not reach the Wiza API: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: (WizaBody & { credits?: unknown }) | null = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: the request probably never reached Wiza */ }

    if (res.ok && body?.credits && typeof body.credits === "object") return { ok: true };
    if (body && (codeOf(body) === 401 || res.status === 401)) {
      return { ok: false, message: `Wiza rejected the API key: ${messageOf(body) ?? "401"}` };
    }
    if (res.status === 429) {
      return { ok: false, message: "Wiza rate limited the probe; the key could not be verified" };
    }
    return {
      ok: false,
      message: `unexpected ${res.status} from GET /api/meta/credits${
        messageOf(body) ? `: ${messageOf(body)}` : ""
      }; the request may not have reached the API`,
    };
  },
};

export default apiKey;
