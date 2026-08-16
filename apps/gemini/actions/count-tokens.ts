import type { ActionDefinition } from "@w6w/types";
import { GeminiClient, modelResource } from "../lib/client.ts";

interface Input {
  model: string;
  contents: unknown;
}

/**
 * `countTokens` — how many tokens `contents` would cost against `model`,
 * without generating anything. Free: it is the same scope-free call this
 * app's auth `test` hook and `quota` health check would use if the API
 * exposed a headroom endpoint (it doesn't — see `health/quota.ts`).
 */
const countTokens: ActionDefinition<Input> = {
  key: "count-tokens",
  type: "read",
  resource: "content",
  title: "Count Tokens",
  description: "Count the tokens a prompt would cost against a model, without generating.",
  params: [
    { key: "model", label: "Model", type: "string", required: true, default: "gemini-3.5-flash" },
    {
      key: "contents",
      label: "Contents",
      type: "json",
      required: true,
      hint: "Array of `{ role, parts: [{ text }] }`, the same shape Generate Content takes.",
    },
  ],
  output: [
    { key: "totalTokens", type: "number", label: "Total tokens" },
    { key: "cachedContentTokenCount", type: "number", label: "Cached-content tokens" },
  ],

  execute(input, ctx) {
    const client = new GeminiClient(ctx);
    return client.request(`/${modelResource(input.model)}:countTokens`, {
      method: "POST",
      body: { contents: input.contents },
    });
  },
};

export default countTokens;
