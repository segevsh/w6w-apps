import type { ActionDefinition } from "@w6w/types";
import { ReplicateClient } from "../lib/client.ts";
import { decorate } from "./prediction-create.ts";

/**
 * `GET /trainings/{training_id}` — verified against Replicate's OpenAPI
 * document (`trainings.get`).
 *
 * A training reports the same states as a prediction, for the same reason: it
 * is one underneath. `failed` arrives with no HTTP error, so the status is the
 * only thing that says whether hours of compute produced anything — and
 * `output.version` is where the trained model's new version id appears.
 */
const action: ActionDefinition = {
  key: "training-get",
  type: "read",
  resource: "training",
  title: "Get a training",
  description: "A training's status and, once it finishes, the version it produced.",
  params: [
    { key: "trainingId", label: "Training ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Training id" },
    { key: "status", type: "string", label: "starting, processing, succeeded, failed or canceled" },
    { key: "output", type: "object", label: "`version` — the trained model's new version id" },
    { key: "error", type: "string", label: "Why it failed" },
    { key: "logs", type: "string", label: "The trainer's logs" },
    { key: "metrics", type: "object", label: "`predict_time` — what the training cost" },
    { key: "finished", type: "boolean", label: "Whether it reached a terminal state" },
    { key: "succeeded", type: "boolean", label: "Whether it finished successfully" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.trainingId ?? "").trim();
    if (!id) throw new Error("`trainingId` is required");

    ctx.log("info", "getting a Replicate training", { id });

    const result = await new ReplicateClient(ctx).request<{ status?: string }>(
      `/trainings/${encodeURIComponent(id)}`,
    );
    return decorate(result);
  },
};

export default action;
