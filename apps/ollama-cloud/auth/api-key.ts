import type { AuthDefinition } from "@w6w/types";
import { BASE_URL } from "../lib/client.ts";

/**
 * Ollama Cloud API key (`bearer`). Mint one at
 * https://ollama.com/settings/keys and paste it here. Every request signs with
 * `Authorization: Bearer <key>`.
 *
 * Unlike a local Ollama server — which has no authentication of its own and
 * whose key field is optional for a proxy in front — the cloud *requires* a key:
 * there is nothing to talk to without one.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description: "Paste an API key minted at https://ollama.com/settings/keys.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "ollama.com → Settings → Keys → Create key.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    if (!String(apiKey ?? "").trim()) {
      return {
        ok: false,
        message: "Ollama Cloud needs an API key — mint one at " +
          "https://ollama.com/settings/keys",
      };
    }
    let res: Response;
    try {
      res = await ctx.fetch(`${BASE_URL}/api/tags`, {
        headers: { authorization: `Bearer ${apiKey}`, accept: "application/json" },
      });
    } catch (err) {
      const tail = String((err as Error)?.message ?? err);
      return { ok: false, message: `could not reach Ollama Cloud: ${tail}` };
    }
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: "Ollama Cloud rejected the API key — check it at https://ollama.com/settings/keys",
      };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, message: `Ollama Cloud returned ${res.status}: ${text.slice(0, 200)}` };
    }
    await res.body?.cancel();
    return { ok: true, message: "connected to Ollama Cloud" };
  },
};

export default apiKey;
