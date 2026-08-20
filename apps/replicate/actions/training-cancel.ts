import type { ActionDefinition } from "@w6w/types";
import { ReplicateClient } from "../lib/client.ts";
import { decorate } from "./prediction-create.ts";

/**
 * `POST /trainings/{training_id}/cancel` — verified against Replicate's
 * OpenAPI document (`trainings.cancel`).
 *
 * **This is the expensive thing to remember.** A training bills for its whole
 * runtime, and a run that is going nowhere costs the same as one that works —
 * so cancelling a bad run is worth real money in a way cancelling a prediction
 * usually is not.
 */
const action: ActionDefinition = {
  key: "training-cancel",
  type: "perform",
  resource: "training",
  title: "Cancel a training",
  description: "Stop a training, and its billing — which for a training is worth real money.",
  idempotent: true,
  params: [
    { key: "trainingId", label: "Training ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Training id" },
    { key: "status", type: "string", label: "Status after cancelling" },
    { key: "finished", type: "boolean", label: "Whether it reached a terminal state" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.trainingId ?? "").trim();
    if (!id) throw new Error("`trainingId` is required");

    ctx.log("info", "cancelling a Replicate training", { id });

    const result = await new ReplicateClient(ctx).request<{ status?: string }>(
      `/trainings/${encodeURIComponent(id)}/cancel`,
      { method: "POST" },
    );
    return decorate(result);
  },
};

export default action;
