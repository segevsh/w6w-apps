import type { ActionDefinition } from "@w6w/types";
import { ReplicateClient } from "../lib/client.ts";
import { decorate } from "./prediction-create.ts";

/**
 * `POST /predictions/{prediction_id}/cancel` — verified against Replicate's
 * OpenAPI document (`predictions.cancel`).
 *
 * **Cancelling stops the billing clock**, which is the reason to bother:
 * Replicate charges for compute time, so a runaway prediction on expensive
 * hardware costs money for as long as nobody stops it. A workflow with a
 * timeout should cancel rather than simply give up waiting.
 *
 * A prediction that has already finished cannot be cancelled, and Replicate
 * says so rather than pretending — which is why this is not a silent no-op.
 */
const action: ActionDefinition = {
  key: "prediction-cancel",
  type: "perform",
  resource: "prediction",
  title: "Cancel a prediction",
  description: "Stop a running prediction, and its billing.",
  idempotent: true,
  params: [
    { key: "predictionId", label: "Prediction ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Prediction id" },
    { key: "status", type: "string", label: "Status after cancelling" },
    { key: "finished", type: "boolean", label: "Whether it reached a terminal state" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.predictionId ?? "").trim();
    if (!id) throw new Error("`predictionId` is required");

    ctx.log("info", "cancelling a Replicate prediction", { id });

    const result = await new ReplicateClient(ctx).request<{ status?: string }>(
      `/predictions/${encodeURIComponent(id)}/cancel`,
      { method: "POST" },
    );
    return decorate(result);
  },
};

export default action;
