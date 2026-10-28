import type { ActionDefinition } from "@w6w/types";
import { BigQueryClient, resolveProject } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /projects/{projectId}/jobs/{jobId}` — verified against BigQuery's
 * discovery document (`jobs.get`).
 *
 * How a workflow waits: `status.state` is `PENDING`, `RUNNING` or `DONE`, and
 * **`DONE` does not mean success** — a failed job is also `DONE`, with the
 * reason under `status.errorResult`. Checking the state alone is the classic
 * way to treat a failure as a success.
 */
const action: ActionDefinition = {
  key: "job-get",
  type: "read",
  resource: "job",
  title: "Get a job",
  description: "Check a job's state, errors and statistics.",
  params: [
    PROJECT_PARAM,
    { key: "jobId", label: "Job ID", type: "string", required: true, default: "" },
    {
      key: "location",
      label: "Location",
      type: "string",
      default: "",
      hint: "The job's region. Omitting it for a non-default region returns not-found.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "status", type: "object", label: "Status — check errorResult, not just state" },
    { key: "statistics", type: "object", label: "Statistics, including bytes processed" },
    { key: "configuration", type: "object", label: "Configuration" },
    { key: "jobReference", type: "object", label: "Job reference" },
    { key: "user_email", type: "string", label: "Who started it" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const jobId = String(p.jobId ?? "").trim();
    if (!jobId) throw new Error("`jobId` is required");

    ctx.log("info", "getting a BigQuery job", { project, jobId });

    return await new BigQueryClient(ctx).request(
      `/projects/${encodeURIComponent(project)}/jobs/${encodeURIComponent(jobId)}`,
      { query: { location: (p.location as string) || undefined } },
    );
  },
};

export default action;
