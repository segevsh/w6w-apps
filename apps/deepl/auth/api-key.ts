import type { AuthDefinition } from "@w6w/types";
import { hostForKey } from "../lib/client.ts";

/**
 * DeepL API key. Mint one at https://www.deepl.com/your-account/keys (Pro) or
 * https://www.deepl.com/en/your-account/keys (Free). Every request signs with
 * `Authorization: DeepL-Auth-Key <key>` — note the `DeepL-Auth-Key` scheme,
 * not the standard `Bearer` prefix
 * (https://developers.deepl.com/docs/getting-started/auth).
 *
 * Free and Pro keys hit different hosts (`api-free.deepl.com` vs
 * `api.deepl.com`), and DeepL encodes which is which in the key itself: a
 * Free key always ends in `:fx`. `sign` only stamps the header — it never
 * needs to route by host, since it is not the thing building the request URL
 * (see `lib/client.ts#hostForConnection` for the full reasoning). `test` runs
 * before `afterConnect` exists yet, so it derives the host from the raw key
 * directly, the same way `afterConnect` does a moment later.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from your DeepL account. Free-tier keys (ending in `:fx`) and Pro keys are detected automatically and routed to the right host.",
  connectionLabel: "DeepL ({{plan}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "DeepL account → API Keys. Free-tier keys end in `:fx`.",
    },
  ],
  apiKey: { in: "header", name: "Authorization", prefix: "DeepL-Auth-Key " },

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `DeepL-Auth-Key ${apiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    const res = await ctx.fetch(`${hostForKey(apiKey)}/v2/usage`, {
      headers: { authorization: `DeepL-Auth-Key ${apiKey}` },
    });
    if (!res.ok) return { ok: false, message: `DeepL returned ${res.status}` };
    return { ok: true };
  },

  /**
   * Derives the non-secret `plan` label every action and the `quota` health
   * check read via `ctx.connection.display` instead of ever touching the raw
   * key (see `lib/client.ts#hostForConnection`).
   */
  afterConnect({ credential }) {
    const { apiKey } = credential as { apiKey: string };
    return { plan: apiKey.endsWith(":fx") ? "free" : "pro" };
  },
};

export default apiKey;
