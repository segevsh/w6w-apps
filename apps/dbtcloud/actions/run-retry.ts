import type { ActionDefinition } from "@w6w/types";
import { DbtCloudClient, runStatusName } from "../lib/client.ts";

/**
 * `POST /api/v2/accounts/{account}/runs/{id}/retry/` — resume a failed run
 * **from the point of failure**.
 *
 * This is the cheap one, and the distinction from `job-run` is worth being
 * precise about. A retry uses the failed run's `run_results.json` to skip every
 * model that already succeeded and rebuild only what failed and what depends on
 * it. On a project where a nightly build takes two hours and one model failed
 * on a transient warehouse error, that is minutes instead of hours.
 *
 * ## It is fussy about what it will retry, and silence is not the answer
 *
 * dbt refuses with a named reason: `RETRY_NOT_FAILED_RUN`,
 * `RETRY_NOT_LATEST_RUN`, `RETRY_NO_RUN_RESULTS`, `RETRY_UNSUPPORTED_CMD`,
 * `RETRY_UNSUPPORTED_VERSION`. **`RETRY_NOT_LATEST_RUN` is the one that catches
 * people** — retry only works on the job's most recent run, so a workflow that
 * retries an hour later, after the schedule has fired again, is refused.
 *
 * `run-retry-details` asks whether a retry is possible *before* attempting it,
 * which is the right shape for a workflow that falls back to a full run.
 */
const action: ActionDefinition = {
  key: "run-retry",
  type: "perform",
  resource: "run",
  title: "Retry a failed run",
  description:
    "Resume a failed run from the point of failure, skipping the models that already succeeded. " +
    "Only works on a job's MOST RECENT run — check `run-retry-details` first.",
  idempotent: false,
  params: [
    { key: "runId", label: "Run ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "number", label: "The NEW run's id" },
    { key: "status", type: "number", label: "Status number" },
    { key: "statusName", type: "string", label: "Status, named" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const runId = String(p.runId ?? "").trim();
    if (!runId) throw new Error("`runId` is required");

    const client = new DbtCloudClient(ctx);
    const run = await client.request<{ id?: number; status?: number }>(
      `/api/v2/accounts/${client.accountId}/runs/${encodeURIComponent(runId)}/retry/`,
      { method: "POST" },
    );
    ctx.log("info", "retried a dbt Cloud run from its point of failure", {
      retriedRunId: runId,
      newRunId: run?.id,
    });
    return { ...run, statusName: runStatusName(run?.status) };
  },
};

export default action;
