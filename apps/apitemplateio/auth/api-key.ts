import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * APITemplate.io API key. Mint one at https://app.apitemplate.io/en/settings/api
 * ("Integration & API" panel). Every request signs with `X-API-KEY: <key>` — no
 * prefix, unlike a bearer token.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste an API key minted from the APITemplate.io dashboard's API settings.",
  apiKey: { in: "header", name: "X-API-KEY" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "APITemplate.io dashboard → Settings → Integration & API.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["x-api-key"] = apiKey;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    const res = await ctx.fetch(`${API_URL}/v2/list-templates?limit=1`, {
      headers: { "x-api-key": apiKey },
    });
    if (!res.ok) return { ok: false, message: `APITemplate.io returned ${res.status}` };
    return { ok: true };
  },
};

export default apiKey;
