import type { ActionDefinition } from "@w6w/types";
import { ReplicateClient } from "../lib/client.ts";
import { decorate } from "./prediction-create.ts";

/**
 * `GET /predictions/{prediction_id}` — verified against Replicate's OpenAPI
 * document (`predictions.get`).
 *
 * **This is the other half of every prediction.** A create returns `starting`
 * with no output; this is where the answer eventually appears.
 *
 * The state worth designing around is **`failed`**: it is reached without any
 * HTTP error, so a workflow that treats the create's `201` as success is wrong
 * every time a model rejects its input. `error` carries the reason, and this
 * action adds `finished` and `succeeded` booleans because "is it done" and
 * "did it work" are what a branch actually tests.
 *
 * `metrics.predict_time` is what the run cost, in seconds of compute — the only
 * per-call cost figure Replicate exposes, and the reason this app's `quota`
 * check declines to invent an account-level one.
 */
const action: ActionDefinition = {
  key: "prediction-get",
  type: "read",
  resource: "prediction",
  title: "Get a prediction",
  description: "Fetch a prediction's status and, once it has run, its output.",
  params: [
    { key: "predictionId", label: "Prediction ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Prediction id" },
    { key: "status", type: "string", label: "starting, processing, succeeded, failed or canceled" },
    { key: "output", type: "object", label: "The model's output" },
    { key: "error", type: "string", label: "Why it failed — set without any HTTP error" },
    { key: "logs", type: "string", label: "The model's logs" },
    { key: "metrics", type: "object", label: "`predict_time` — what this cost, in seconds" },
    { key: "started_at", type: "string", label: "Started" },
    { key: "completed_at", type: "string", label: "Completed" },
    { key: "finished", type: "boolean", label: "Whether it reached a terminal state" },
    { key: "succeeded", type: "boolean", label: "Whether it finished successfully" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.predictionId ?? "").trim();
    if (!id) throw new Error("`predictionId` is required");

    ctx.log("info", "getting a Replicate prediction", { id });

    const result = await new ReplicateClient(ctx).request<{ status?: string }>(
      `/predictions/${encodeURIComponent(id)}`,
    );
    return decorate(result);
  },
};

export default action;
