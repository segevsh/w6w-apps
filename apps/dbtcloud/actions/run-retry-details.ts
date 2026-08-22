import type { ActionDefinition } from "@w6w/types";
import { DbtCloudClient } from "../lib/client.ts";

/**
 * `GET /api/v2/accounts/{account}/runs/{id}/retry/` — *can* this run be
 * retried, and what would a retry actually do?
 *
 * The read-side counterpart to `run-retry`, and the reason a retry workflow can
 * be written without a try/fail/fallback dance. It answers two things:
 *
 *   - whether a retry is possible at all, and when it is not, **which** of
 *     dbt's five reasons applies — `RETRY_NOT_LATEST_RUN` (something has run
 *     since), `RETRY_NOT_FAILED_RUN` (it succeeded), `RETRY_NO_RUN_RESULTS`
 *     (it failed before writing results, so there is nothing to resume from),
 *     `RETRY_UNSUPPORTED_CMD`, `RETRY_UNSUPPORTED_VERSION`;
 *   - which **models** failed, which is the useful half for a notification. "The
 *     nightly build failed" is a page; "`fct_orders` failed on a permission
 *     error, 340 models were fine" is a ticket.
 *
 * A `404` here means the run is too old for dbt to answer about rather than
 * that it never existed, and is reported as "not retryable" rather than raised.
 */
const action: ActionDefinition = {
  key: "run-retry-details",
  type: "read",
  resource: "run",
  title: "Get retry details for a run",
  description:
    "Whether a failed run can be retried and, when it cannot, dbt's named reason — plus which " +
    "models failed, which is what a useful alert says.",
  params: [
    { key: "runId", label: "Run ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "retryable", type: "boolean", label: "A retry would be accepted" },
    { key: "reason", type: "string", label: "Why not, when it would not" },
    { key: "failedNodes", type: "array", label: "The models that failed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const runId = String(p.runId ?? "").trim();
    if (!runId) throw new Error("`runId` is required");

    const client = new DbtCloudClient(ctx);
    let details: Record<string, unknown> | undefined;
    try {
      details = await client.request<Record<string, unknown>>(
        `/api/v2/accounts/${client.accountId}/runs/${encodeURIComponent(runId)}/retry/`,
      );
    } catch (err) {
      // Too old to answer about is a "no", not a failure of this action.
      if (/\b404\b/.test(String(err))) {
        return {
          retryable: false,
          reason: "dbt has no retry information for this run — it is likely too old",
          failedNodes: [],
        };
      }
      throw err;
    }

    const reason = details?.retry_not_supported_reason ??
      (details as { reason?: string } | undefined)?.reason;
    const failedNodes = (details?.failed_nodes ?? details?.nodes ?? []) as unknown[];
    return {
      ...details,
      retryable: !reason,
      reason: reason === undefined || reason === null ? undefined : String(reason),
      failedNodes: Array.isArray(failedNodes) ? failedNodes : [],
    };
  },
};

export default action;
