import type { ActionDefinition } from "@w6w/types";
import { DbtCloudClient, runStatusName } from "../lib/client.ts";

/**
 * `POST /api/v2/accounts/{account}/jobs/{job}/rerun/` — retry this job's last
 * failed run, **or start a fresh one if it did not fail**.
 *
 * That "or" is the whole reason this action carries a warning. dbt describes it
 * as retrying from the point of failure "if the run failed. Otherwise trigger a
 * new run" — so the same call means two very different things depending on
 * state you did not check:
 *
 *   - last run failed → resume it, building only what failed. Minutes.
 *   - last run succeeded → **a complete fresh build of everything**. Hours, and
 *     a full warehouse rebuild nobody asked for.
 *
 * It is the convenient call for a human clicking a button and a trap for a
 * scheduled workflow. `run-retry` on a specific run id refuses rather than
 * escalating, which is what a workflow usually wants; this action exists
 * because the job-level form is genuinely useful when you *do* want either
 * outcome, and it logs which one it is about to be where it can tell.
 *
 * Unlike `job-run`, dbt takes no `cause` here — the run is attributed to the
 * retry, and there is no field to say why.
 */
const action: ActionDefinition = {
  key: "job-rerun",
  type: "perform",
  resource: "job",
  title: "Retry a job's last failed run",
  description:
    "Resume this job's last run from its point of failure — or, if that run SUCCEEDED, start a " +
    "complete fresh build instead. The same call means both.",
  idempotent: false,
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true, default: "" },
    {
      key: "confirmFullRebuild",
      label: "A full rebuild is acceptable",
      type: "boolean",
      required: true,
      default: false,
      hint: "If the job's last run did not fail, this triggers a complete build of every model. " +
        "Use `run-retry` on a run id when only a resume is acceptable.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "The new run's id" },
    { key: "status", type: "number", label: "Status number" },
    { key: "statusName", type: "string", label: "Status, named" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const jobId = String(p.jobId ?? "").trim();
    if (!jobId) throw new Error("`jobId` is required");
    if (p.confirmFullRebuild !== true) {
      throw new Error(
        "set `confirmFullRebuild` — if this job's last run did not fail, rerun starts a complete " +
          "build of every model rather than resuming anything. Use `run-retry` to refuse instead",
      );
    }

    const client = new DbtCloudClient(ctx);
    const run = await client.request<{ id?: number; status?: number }>(
      `/api/v2/accounts/${client.accountId}/jobs/${encodeURIComponent(jobId)}/rerun/`,
      { method: "POST" },
    );
    ctx.log("info", "reran a dbt Cloud job", { jobId, runId: run?.id });
    return { ...run, statusName: runStatusName(run?.status) };
  },
};

export default action;
