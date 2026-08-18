import type { ActionDefinition } from "@w6w/types";
import { compact, HuggingFaceClient, json, ROUTER } from "../lib/client.ts";

/**
 * `POST router.huggingface.co/v1/chat/completions` — inference, in OpenAI's
 * shape.
 *
 * ## The router is a dispatcher, not a model host
 *
 * Hugging Face does not serve most of these models itself. The router picks an
 * **inference provider** — Together, Fireworks, Cerebras, Novita, SambaNova,
 * Hugging Face's own — and forwards the request. That has three consequences
 * worth knowing:
 *
 * - **The same model can cost and behave differently** depending on which
 *   provider answered. `provider` pins one; leaving it unset lets the router
 *   choose, which is fine for a chat and not for a benchmark.
 * - **Not every model is available for inference.** The Hub hosts hundreds of
 *   thousands; the router serves the fraction that some provider has deployed.
 *   `inference-model-list` is what actually answers "can I call this".
 * - **Billing is the provider's**, routed through the Hugging Face account.
 *
 * ## It is OpenAI-compatible, which is the point
 *
 * Same request body, same response shape, same `choices[0].message.content`.
 * A workflow written against `apps/openai` moves here by changing the model
 * name — that compatibility is deliberate on Hugging Face's part and is the
 * main reason to reach for this over a provider's own API.
 *
 * ## A cold start is a 503, not a failure
 *
 * A model that is not currently loaded returns 503 with an `estimated_time`.
 * The right response is to wait roughly that long and retry; treating it as an
 * outage is how a workflow gives up on a model that would have answered twenty
 * seconds later.
 */
const action: ActionDefinition = {
  key: "chat-complete",
  type: "perform",
  resource: "inference",
  title: "Run a chat completion",
  description:
    "Chat inference through the router, in OpenAI's request and response shape. The router " +
    "DISPATCHES to a provider — the same model can behave differently depending on which.",
  idempotent: false,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "",
      placeholder: "meta-llama/Llama-3.3-70B-Instruct",
      hint: "A Hub repository id. Only the fraction of the Hub some provider has deployed can be " +
        "called — `inference-model-list` says which.",
    },
    {
      key: "messages",
      label: "Messages",
      type: "json",
      required: true,
      default: "",
      hint: 'OpenAI shape: [{"role":"user","content":"…"}].',
    },
    {
      key: "provider",
      label: "Provider",
      type: "string",
      default: "",
      hint: "Pins one inference provider. Left blank the router chooses, which is fine for a " +
        "chat and not for a benchmark — the same model differs between providers.",
    },
    {
      key: "temperature",
      label: "Temperature",
      type: "number",
      default: 0,
      advanced: true,
      hint: "Zero here means 'unset', not 'deterministic' — omit it to take the model's default.",
    },
    {
      key: "maxTokens",
      label: "Max Tokens",
      type: "number",
      default: 0,
      advanced: true,
    },
    {
      key: "extra",
      label: "Extra Parameters",
      type: "json",
      default: "",
      advanced: true,
      hint: "Merged into the request — `top_p`, `stop`, `response_format`, whatever the provider " +
        "supports.",
    },
  ],
  output: [
    { key: "content", type: "string", label: "The reply text" },
    { key: "finishReason", type: "string", label: "stop, length, or a provider's own" },
    { key: "usage", type: "object", label: "Token counts, when the provider reports them" },
    { key: "model", type: "string", label: "What actually answered" },
    { key: "response", type: "object", label: "The full OpenAI-shaped response" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const model = String(p.model ?? "").trim();
    if (!model) throw new Error("`model` is required");

    const parsed = json(p.messages, "messages");
    const messages = Array.isArray(parsed) ? parsed : undefined;
    if (!messages || messages.length === 0) {
      throw new Error("`messages` must be a non-empty array of {role, content}");
    }

    const temperature = Number(p.temperature ?? 0);
    const maxTokens = Number(p.maxTokens ?? 0);
    const extra = (json(p.extra, "extra") ?? {}) as Record<string, unknown>;

    const result = await new HuggingFaceClient(ctx).request<{
      model?: string;
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      usage?: Record<string, number>;
    }>("/v1/chat/completions", {
      host: ROUTER,
      method: "POST",
      body: compact({
        ...extra,
        // `provider` is a router extension on an otherwise OpenAI-shaped body.
        model: String(p.provider ?? "").trim() ? `${model}:${String(p.provider).trim()}` : model,
        messages,
        // Zero means unset here, not deterministic.
        temperature: temperature > 0 ? temperature : undefined,
        max_tokens: maxTokens > 0 ? maxTokens : undefined,
      }),
    });

    const choice = result?.choices?.[0];
    ctx.log("info", "ran a Hugging Face chat completion", {
      model,
      finishReason: choice?.finish_reason,
      // Counts, never the prompt or the reply.
      completionTokens: result?.usage?.completion_tokens,
    });

    return {
      content: choice?.message?.content,
      finishReason: choice?.finish_reason,
      usage: result?.usage,
      // What answered, which may name the provider the router chose.
      model: result?.model,
      response: result,
    };
  },
};

export default action;
