import type { ActionDefinition } from "@w6w/types";
import { circleciFetch } from "../lib/client.ts";

/**
 * List the jobs that ran under a workflow.
 * `GET /workflow/{id}/job` —
 * https://circleci.com/docs/api/v2/#tag/Workflow/operation/listWorkflowJobs
 *
 * Each job in the response carries `job_number`, the value `job-get` needs
 * to look up a single job's full detail.
 */
const action: ActionDefinition = {
  key: "job-list",
  type: "read",
  resource: "job",
  title: "List a workflow's jobs",
  description: "List the jobs that ran under a workflow",
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

    ctx.log("info", "listing CircleCI workflow jobs", { workflowId });

    return await circleciFetch(ctx, `/workflow/${encodeURIComponent(workflowId)}/job`);
  },
};

export default action;
