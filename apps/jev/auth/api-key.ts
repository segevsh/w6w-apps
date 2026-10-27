import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * TypeSafe API key (`bearer`). Every request signs with
 * `Authorization: Bearer <key>`.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "Paste your TypeSafe API key (the TYPESAFE_API_KEY value).",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "TypeSafe dashboard → API keys.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    const res = await ctx.fetch(`${API_URL}/models`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { ok: false, message: `Jev returned ${res.status}` };
    return { ok: true };
  },
};

export default apiKey;
