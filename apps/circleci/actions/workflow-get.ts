import type { ActionDefinition } from "@w6w/types";
import { circleciFetch } from "../lib/client.ts";

/**
 * Get a single workflow by its UUID.
 * `GET /workflow/{id}` —
 * https://circleci.com/docs/api/v2/#tag/Workflow/operation/getWorkflowById
 */
const action: ActionDefinition = {
  key: "workflow-get",
  type: "read",
  resource: "workflow",
  title: "Get a workflow",
  description: "Get details for a single workflow by its ID",
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

    ctx.log("info", "getting CircleCI workflow", { workflowId });

    return await circleciFetch(ctx, `/workflow/${encodeURIComponent(workflowId)}`);
  },
};

export default action;
