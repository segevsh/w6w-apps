import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient } from "../lib/client.ts";

/**
 * `DELETE /v1/maintenance-windows/{id}` — verified against Checkly's OpenAPI
 * document (`deleteV1MaintenancewindowsId`).
 *
 * The other half of a deploy workflow: end the window early once the deploy is
 * verified, so monitoring resumes rather than waiting out the clock.
 */
const action: ActionDefinition = {
  key: "maintenance-window-delete",
  type: "perform",
  resource: "maintenance-window",
  title: "Delete a maintenance window",
  description: "End a maintenance window, restoring alerting immediately.",
  idempotent: true,
  params: [
    { key: "windowId", label: "Window ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "windowId", type: "string", label: "Window id" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.windowId ?? "").trim();
    if (!id) throw new Error("`windowId` is required");

    ctx.log("info", "deleting a Checkly maintenance window", { id });

    await new ChecklyClient(ctx).request(
      `/v1/maintenance-windows/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    return { windowId: id, deleted: true };
  },
};

export default action;
