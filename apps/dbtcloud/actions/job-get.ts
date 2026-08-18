import type { ActionDefinition } from "@w6w/types";
import { csv, DbtCloudClient } from "../lib/client.ts";

/**
 * `GET /api/v2/accounts/{account}/jobs/{id}/` — one job's definition.
 *
 * The fields worth reading are the ones that decide what triggering it will
 * actually do: `execute_steps` (the dbt commands, in order),
 * `environment_id` (and therefore which warehouse and schema), and
 * `triggers` (whether it also runs on a schedule or on a pull request, so a
 * manual trigger may be one of several concurrent runs).
 *
 * `settings.threads` and `execution.timeout_seconds` are the two a workflow
 * most often wants to override on a one-off run — see `job-run`.
 */
const action: ActionDefinition = {
  key: "job-get",
  type: "read",
  resource: "job",
  title: "Get a job",
  description:
    "One job's definition — its dbt commands, environment and triggers, which together decide " +
    "what a run will actually do.",
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true, default: "" },
    {
      key: "includeRelated",
      label: "Include Related",
      type: "string",
      default: "",
      hint: "`environment`, `most_recent_run`, `most_recent_completed_run`, " +
        "`custom_environment_variables`.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Job ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "execute_steps", type: "array", label: "The dbt commands, in order" },
    { key: "environment_id", type: "number", label: "Environment" },
    { key: "triggers", type: "object", label: "Schedule and CI triggers" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const jobId = String(p.jobId ?? "").trim();
    if (!jobId) throw new Error("`jobId` is required");

    const client = new DbtCloudClient(ctx);
    return await client.request(
      `/api/v2/accounts/${client.accountId}/jobs/${encodeURIComponent(jobId)}/`,
      { query: { include_related: csv(p.includeRelated)?.join(",") } },
    );
  },
};

export default action;
