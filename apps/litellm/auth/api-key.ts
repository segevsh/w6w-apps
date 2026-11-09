import type { AuthDefinition } from "@w6w/types";

/**
 * The vendors the embedded proxy serves, as `<prefix>` → label. MUST match the server's
 * `LITELLM_PROVIDERS` (`packages/server/packages/bll/model-litellm.ts`) and
 * `packages/server/litellm/config.yaml`; the server refuses any other prefix.
 */
export const VENDORS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "gemini", label: "Google Gemini (AI Studio key)" },
  { value: "groq", label: "Groq" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "together_ai", label: "Together AI" },
  { value: "fireworks_ai", label: "Fireworks AI" },
  { value: "cerebras", label: "Cerebras" },
  { value: "deepinfra", label: "DeepInfra" },
  { value: "sambanova", label: "SambaNova" },
  { value: "cohere_chat", label: "Cohere" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "mistral", label: "Mistral" },
  { value: "xai", label: "xAI" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "perplexity", label: "Perplexity" },
];

/**
 * A vendor plus that vendor's own API key. Models are named `<vendor>/<model>`
 * (`gemini/gemini-2.5-flash`), and the host only sends the key to the vendor named here.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "Vendor API key",
  description: "Pick the vendor, then paste an API key minted in that vendor's own console.",
  fields: [
    {
      key: "provider",
      label: "Vendor",
      type: "select",
      required: true,
      options: VENDORS.map((v) => ({ value: v.value, label: v.label })),
      hint:
        "Models from this connection are named `<vendor>/<model>`, e.g. `gemini/gemini-2.5-flash`.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "The vendor's own key — LiteLLM holds no keys of its own.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  // Offline: the proxy is loopback-only, so the sandbox cannot reach it. The key is checked by
  // the vendor on the first model call.
  test({ credential }) {
    const { provider, apiKey } = credential as { provider?: string; apiKey?: string };
    if (!VENDORS.some((v) => v.value === provider)) {
      return Promise.resolve({ ok: false, message: "Pick one of the listed vendors." });
    }
    if (!String(apiKey ?? "").trim()) {
      return Promise.resolve({ ok: false, message: "Paste the vendor's API key." });
    }
    return Promise.resolve({
      ok: true,
      message: "Saved — the vendor checks the key on the first model call.",
    });
  },
};

export default apiKey;
