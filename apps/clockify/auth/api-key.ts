import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * API Key (`apiKey`).
 *
 * Clockify's own credential test (n8n's `ClockifyApi.credentials.ts`, its
 * canonical integration source) authenticates every request with a plain
 * `X-Api-Key: <key>` header — no prefix, no Basic/Bearer envelope. Verified
 * live: an unauthenticated `GET /workspaces` returns 401 with
 * `{"message":"Multiple or none auth tokens present","code":1000}`, and the
 * same call with a real key returns the caller's workspace list — n8n's own
 * credential test hits the identical `GET /workspaces` for exactly this
 * reason (cheapest authenticated call, no workspace ID required upfront).
 *
 * Generate a key from the user's Clockify profile settings
 * (clockify.me/user/settings, "API" section at the bottom).
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste your API key from clockify.me/user/settings.",
  apiKey: { in: "header", name: "X-Api-Key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "clockify.me/user/settings → API section, near the bottom of the page.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["x-api-key"] = apiKey;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) {
      return { ok: false, message: "credential missing apiKey" };
    }
    const res = await ctx.fetch(`${API_URL}/workspaces`, {
      headers: { "x-api-key": apiKey },
    });
    if (!res.ok) return { ok: false, message: `Clockify returned ${res.status}` };
    return { ok: true };
  },
};

export default apiKey;
