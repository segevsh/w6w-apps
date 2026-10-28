import type { ActionDefinition } from "@w6w/types";
import { BigQueryClient, resolveProject } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /projects/{projectId}/jobs/{jobId}/cancel` — verified against
 * BigQuery's discovery document (`jobs.cancel`).
 *
 * The call is a **request**, not a guarantee: BigQuery may have finished the
 * job already, and cancellation is asynchronous. The response carries the job's
 * current state, so read it rather than assuming the job stopped.
 */
const action: ActionDefinition = {
  key: "job-cancel",
  type: "perform",
  resource: "job",
  title: "Cancel a job",
  description: "Request cancellation of a running job.",
  // Cancelling twice lands in the same state.
  idempotent: true,
  params: [
    PROJECT_PARAM,
    { key: "jobId", label: "Job ID", type: "string", required: true, default: "" },
    { key: "location", label: "Location", type: "string", default: "" },
  ],
  output: [{ key: "job", type: "object", label: "The job, with its state after the request" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const jobId = String(p.jobId ?? "").trim();
    if (!jobId) throw new Error("`jobId` is required");

    ctx.log("info", "cancelling a BigQuery job", { project, jobId });

    return await new BigQueryClient(ctx).request(
      `/projects/${encodeURIComponent(project)}/jobs/${encodeURIComponent(jobId)}/cancel`,
      { method: "POST", query: { location: (p.location as string) || undefined } },
    );
  },
};

export default action;
