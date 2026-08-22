import type { ActionDefinition } from "@w6w/types";
import { DbtCloudClient, runStatusName } from "../lib/client.ts";

/**
 * `POST /api/v2/accounts/{account}/runs/{id}/cancel/` — stop a run.
 *
 * The honest caveat: **cancelling does not undo what has already been built.**
 * dbt writes each model as it finishes, so a run stopped halfway leaves the
 * warehouse in a partially-rebuilt state — some tables from this run, some from
 * the last. That is usually fine and occasionally very much not, and no API can
 * tell you which.
 *
 * It is idempotent in the sense that matters: cancelling a run that has already
 * finished is not an error, it just does nothing.
 */
const action: ActionDefinition = {
  key: "run-cancel",
  type: "perform",
  resource: "run",
  title: "Cancel a run",
  description:
    "Stop a run in flight. It does NOT undo what has already been built — dbt writes each model " +
    "as it finishes, so the warehouse is left partially rebuilt.",
  idempotent: true,
  params: [
    { key: "runId", label: "Run ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "number", label: "Run ID" },
    { key: "status", type: "number", label: "Status number" },
    { key: "statusName", type: "string", label: "Status, named" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const runId = String(p.runId ?? "").trim();
    if (!runId) throw new Error("`runId` is required");

    const client = new DbtCloudClient(ctx);
    ctx.log("warn", "cancelling a dbt Cloud run — models already built are left in place", {
      runId,
    });
    const run = await client.request<{ status?: number }>(
      `/api/v2/accounts/${client.accountId}/runs/${encodeURIComponent(runId)}/cancel/`,
      { method: "POST" },
    );
    return { ...run, statusName: runStatusName(run?.status) };
  },
};

export default action;
