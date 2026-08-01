import type { ActionDefinition } from "@w6w/types";
import { circleciFetch } from "../lib/client.ts";

/**
 * Cancel a running workflow.
 * `POST /workflow/{id}/cancel` —
 * https://circleci.com/docs/api/v2/#tag/Workflow/operation/cancelWorkflow
 */
const action: ActionDefinition = {
  key: "workflow-cancel",
  type: "perform",
  resource: "workflow",
  title: "Cancel a workflow",
  description: "Cancel a running workflow",
  // Cancelling an already-cancelled/finished workflow is a safe no-op-equivalent retry.
  idempotent: true,
  params: [
    {
      key: "workflowId",
      label: "Workflow ID",
      type: "string",
      required: true,
      default: "",
      hint: "The workflow's UUID",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const workflowId = String(p.workflowId ?? "").trim();
    if (!workflowId) throw new Error("`workflowId` is required");

    ctx.log("info", "cancelling CircleCI workflow", { workflowId });

    return await circleciFetch(ctx, `/workflow/${encodeURIComponent(workflowId)}/cancel`, {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
  },
};

export default action;
