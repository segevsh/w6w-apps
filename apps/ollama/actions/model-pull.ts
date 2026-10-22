import type { ActionDefinition } from "@w6w/types";
import { OllamaClient, requiredString } from "../lib/client.ts";

/**
 * `POST /api/pull` with `stream: false` — download a model from the registry.
 *
 * ## This can take a very long time
 *
 * With streaming off the request does not answer until the **whole download has
 * finished**: minutes for a small model, much longer for a large one, with no
 * progress in between. A step timeout, a proxy's read timeout (nginx defaults to
 * 60 s) or a tunnel can cut the connection first. The pull itself usually keeps
 * going on the server, so after a timeout check `model-list` before retrying.
 *
 * Re-pulling a model that is already current is cheap: Ollama verifies the
 * layers and returns `success`, which is why this is safe to retry.
 */
const action: ActionDefinition = {
  key: "model-pull",
  type: "perform",
  resource: "model",
  title: "Pull a model",
  description:
    "Download a model from the Ollama registry onto your server (non-streaming). The call does " +
    "not return until the download finishes, which can take many minutes for a large model — " +
    "a timeout does not necessarily stop the pull; check the model list before retrying.",
  idempotent: true,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "",
      placeholder: "llama3.2:3b",
      hint: "`name:tag` from the Ollama library. Without a tag the server pulls `latest`.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "`success` once the model is installed" },
    { key: "success", type: "boolean", label: "Whether the pull completed" },
    { key: "model", type: "string", label: "The model that was pulled" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const model = requiredString(p.model, "model");
    const r = await new OllamaClient(ctx).request<{ status?: string; error?: string }>(
      "/api/pull",
      { method: "POST", body: { model, stream: false } },
    );
    if (r?.error) throw new Error(`Ollama could not pull ${model}: ${r.error}`);
    return { status: r?.status, success: r?.status === "success", model };
  },
};

export default action;
