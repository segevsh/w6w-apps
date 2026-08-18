import type { ActionDefinition } from "@w6w/types";
import { LoopsClient } from "../lib/client.ts";

/**
 * `GET /v1/workflows/{workflowId}` — verified against Loops' OpenAPI document
 * (`getWorkflow`).
 *
 * Returns the workflow's nodes as well as its properties, which is how you find
 * out what an event actually triggers before firing one.
 */
const action: ActionDefinition = {
  key: "workflow-get",
  type: "read",
  resource: "workflow",
  title: "Get a workflow",
  description: "Retrieve one workflow, its trigger and its nodes.",
  params: [
    { key: "workflowId", label: "Workflow ID", type: "string", required: true, default: "" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.workflowId ?? "").trim();
    if (!id) throw new Error("`workflowId` is required");

    ctx.log("info", "getting a Loops workflow", { id });

    return await new LoopsClient(ctx).request(`/workflows/${encodeURIComponent(id)}`);
  },
};

export default action;
