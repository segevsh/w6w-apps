import type { ActionDefinition } from "@w6w/types";
import { OllamaClient, requiredString } from "../lib/client.ts";

/**
 * Unload a model from memory — `POST /api/generate` with no prompt and
 * `keep_alive: 0`, which is Ollama's documented way to do it.
 *
 * Frees GPU/RAM at once instead of waiting out the keep-alive. It is a
 * text-generation model path: an embedding-only model has no generate endpoint
 * and may answer an error here.
 */
const action: ActionDefinition = {
  key: "model-unload",
  type: "perform",
  resource: "model",
  title: "Unload a model from memory",
  description:
    "Free a loaded model's memory on your Ollama server immediately instead of waiting for its " +
    "keep-alive to expire. The model stays installed. Works for text-generation models.",
  idempotent: true,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "",
      placeholder: "llama3.2:3b",
      hint: "`model-running` shows what is loaded.",
    },
  ],
  output: [
    { key: "unloaded", type: "boolean", label: "True when the server reports it unloaded" },
    { key: "doneReason", type: "string", label: "`unload` when it worked" },
    { key: "model", type: "string", label: "The model" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const model = requiredString(p.model, "model");
    const r = await new OllamaClient(ctx).request<{ done_reason?: string }>("/api/generate", {
      method: "POST",
      body: { model, keep_alive: 0, stream: false },
    });
    return { unloaded: r?.done_reason === "unload", doneReason: r?.done_reason, model };
  },
};

export default action;
