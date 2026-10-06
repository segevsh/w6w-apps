import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Superchat API key — a workspace administrator copies it from
 * `Settings > Integrations > API` in the web app. Every request carries it in
 * `X-API-KEY: <key>` (no prefix). The key has global read and write access.
 *
 * The failure bodies are EMPTY: a missing key is a bare `401`, a wrong key a
 * bare `403` (`content-length: 0`, measured live), so `test` can only classify
 * from the status code — there is no vendor error code to read.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste the API key from Superchat under Settings > Integrations > API.",
  apiKey: { in: "header", name: "X-API-KEY" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Superchat web app → Settings → Integrations → API (workspace administrators only).",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["x-api-key"] = apiKey;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    // GET /me answers the user and workspace name — it never echoes the key.
    const res = await ctx.fetch(`${API_URL}/me`, { headers: { "x-api-key": apiKey } });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: `Superchat rejected the API key (HTTP ${res.status})` };
    }
    return { ok: false, message: `Superchat returned HTTP ${res.status}` };
  },
};

export default apiKey;
