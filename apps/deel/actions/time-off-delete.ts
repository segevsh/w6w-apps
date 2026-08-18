import type { ActionDefinition } from "@w6w/types";
import { DeelClient } from "../lib/client.ts";

/**
 * `DELETE /time_offs/{time_off_id}` — verified against Deel's own OpenAPI
 * document (`hris-endpoints.json`, `delete-time-off-request`).
 */
const action: ActionDefinition = {
  key: "time-off-delete",
  type: "perform",
  resource: "timeOff",
  title: "Cancel a time-off request",
  description: "Withdraw a time-off request.",
  idempotent: true,
  params: [
    { key: "timeOffId", label: "Time Off ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Time Off ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const timeOffId = String(p.timeOffId ?? "").trim();
    if (!timeOffId) throw new Error("`timeOffId` is required");

    ctx.log("info", "deleting Deel time-off request", { timeOffId });

    await new DeelClient(ctx).request(`/time_offs/${encodeURIComponent(timeOffId)}`, {
      method: "DELETE",
    });
    return { id: timeOffId, deleted: true };
  },
};

export default action;
