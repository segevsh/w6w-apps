import type { ActionDefinition } from "@w6w/types";
import { csv, DbtCloudClient, runStatusName } from "../lib/client.ts";

/**
 * `GET /api/v2/accounts/{account}/runs/{id}/` — where has this run got to?
 *
 * The other half of `job-run`. A trigger returns a queued run; this is what a
 * workflow polls until it stops moving.
 *
 * ## Branch on the booleans, not the number
 *
 * `status` is an integer and the values are **not contiguous**: 1 Queued,
 * 2 Starting, 3 Running, 10 Success, 20 Error, 30 Cancelled. There is no 4
 * through 9. A condition written as `status === 4` waits forever, and
 * `status > 3` happens to work by accident.
 *
 * dbt returns `is_complete`, `is_success`, `is_error` and `is_cancelled`
 * alongside, and those are what a workflow should branch on. This action also
 * returns `statusName` so a notification can say "Error" rather than "20".
 *
 * ## Finished is not the same as artifacts being ready
 *
 * `artifacts_saved` is separate, and a run that failed early may have none.
 * `run-artifact-get` therefore checks the run first rather than 404ing.
 *
 * `include_related` is where the detail lives — `run_steps` gives per-command
 * timing and status, `job` names the job without a second call, and
 * `debug_logs` is the full dbt log. That last one is **large**, so it is opt-in
 * and the parameter says so.
 */
const action: ActionDefinition = {
  key: "run-get",
  type: "read",
  resource: "run",
  title: "Get a run",
  description:
    "Where a run has got to. Branch on `is_complete` / `is_success`, not on the status number — " +
    "the numbers skip 4 through 9.",
  params: [
    { key: "runId", label: "Run ID", type: "string", required: true, default: "" },
    {
      key: "includeRelated",
      label: "Include Related",
      type: "string",
      default: "",
      placeholder: "run_steps,job",
      hint: "Comma-separated: `trigger`, `job`, `audit`, `run_steps`, `debug_logs`. " +
        "`debug_logs` is the entire dbt log and can be very large.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Run ID" },
    { key: "status", type: "number", label: "Status number" },
    { key: "statusName", type: "string", label: "Status, named" },
    { key: "is_complete", type: "boolean", label: "Finished — branch on this" },
    { key: "is_success", type: "boolean", label: "Finished successfully" },
    { key: "is_error", type: "boolean", label: "Finished with an error" },
    { key: "status_message", type: "string", label: "dbt's own message" },
    { key: "artifacts_saved", type: "boolean", label: "Artifacts are downloadable" },
    { key: "can_retry", type: "boolean", label: "Retryable from the point of failure" },
    { key: "href", type: "string", label: "Link to the run in dbt Cloud" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const runId = String(p.runId ?? "").trim();
    if (!runId) throw new Error("`runId` is required");

    const client = new DbtCloudClient(ctx);
    const related = csv(p.includeRelated);
    const run = await client.request<{ status?: number }>(
      `/api/v2/accounts/${client.accountId}/runs/${encodeURIComponent(runId)}/`,
      { query: { include_related: related?.join(",") } },
    );
    return { ...run, statusName: runStatusName(run?.status) };
  },
};

export default action;
