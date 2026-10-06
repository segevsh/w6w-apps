import type { AuthDefinition } from "@w6w/types";
import { API_URL, type ErrorBody } from "../lib/client.ts";

/**
 * API key — Prospeo takes it in an `X-KEY` header (not `Authorization`). Keys are created
 * in the dashboard, and a team can hold several.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Create a key in the Prospeo dashboard. Sent as the `X-KEY` header.",
  apiKey: { in: "header", name: "X-KEY" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Prospeo dashboard → API. A team may hold several keys.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey: key } = credential as { apiKey: string };
    request.headers["x-key"] = key;
    return request;
  },

  /**
   * Probe: `GET /account-information`, which is free and returns plan and credits, never the
   * key. A rejected key is HTTP 400 `{ error: true, error_code: "INVALID_API_KEY" }` (measured
   * 2026-10-06), so the verdict is read from `error_code`, not from the status. A 429 proves
   * the key was recognised.
   */
  async test({ credential }, ctx) {
    const { apiKey: key } = credential as { apiKey?: string };
    if (!key) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/account-information`, {
        headers: { "x-key": key, accept: "application/json" },
      });
    } catch (e) {
      return { ok: false, message: `could not reach the Prospeo API: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: (ErrorBody & { response?: unknown }) | null = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: the request probably never reached Prospeo */ }

    if (res.status === 429) return { ok: true };
    if (body?.error === false && body.response && typeof body.response === "object") {
      return { ok: true };
    }
    if (body?.error === true) {
      return {
        ok: false,
        message: body.error_code === "INVALID_API_KEY"
          ? "Prospeo rejected the API key (INVALID_API_KEY)"
          : `Prospeo returned ${res.status} ${body.error_code ?? ""}`.trim(),
      };
    }
    return {
      ok: false,
      message:
        `unexpected ${res.status} body from GET /account-information; the request may not have reached the API`,
    };
  },
};

export default apiKey;
