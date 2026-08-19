import type { ActionDefinition } from "@w6w/types";
import { AirbyteClient } from "../lib/client.ts";

/**
 * `DELETE /v1/jobs/{jobId}` — stop a running sync.
 *
 * ## A DELETE that cancels rather than deletes
 *
 * The job record survives with `status: "cancelled"`; what stops is the work.
 * The verb is misleading enough to be worth stating, because "delete the job"
 * and "stop the sync" would have very different consequences for a history a
 * workflow is reading.
 *
 * ## Cancelling mid-sync leaves the destination partly written
 *
 * Airbyte writes as it goes. A cancelled sync therefore leaves whatever had
 * already landed — which for an append mode is a partial batch that a re-run
 * will add to again, and for an overwrite mode may be a half-replaced table.
 * The remedy is another sync, not a rollback; there is nothing to roll back to.
 *
 * ## What it is for
 *
 * A sync that has clearly wedged, or one competing for a source that is needed
 * for something more urgent. Both are judgement calls, which is why this
 * reports what was running rather than just succeeding.
 */
const action: ActionDefinition = {
  key: "job-cancel",
  type: "perform",
  resource: "job",
  title: "Cancel a job",
  description:
    "Stop a running sync. Airbyte's verb is DELETE, but the job record survives as `cancelled` " +
    "— what stops is the work. Airbyte writes as it goes, so a cancelled sync leaves the " +
    "destination partly written, and the remedy is another sync rather than a rollback.",
  idempotent: true,
  params: [
    { key: "jobId", label: "Job ID", type: "number", required: true, default: 0 },
  ],
  output: [
    { key: "jobId", type: "number", label: "Which job" },
    { key: "status", type: "string", label: "What it is now" },
    { key: "wasRunning", type: "boolean", label: "Whether there was anything to stop" },
    { key: "connectionId", type: "string", label: "Which pipeline" },
    { key: "rowsSynced", type: "number", label: "What had already landed" },
    { key: "cancelled", type: "boolean", label: "Whether this call changed anything" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const jobId = Number(p.jobId ?? 0);
    if (!Number.isInteger(jobId) || jobId <= 0) {
      throw new Error("`jobId` must be the numeric id `sync-trigger` and `job-list` report");
    }

    const client = new AirbyteClient(ctx);
    const before = await client.request<{
      status?: string;
      connectionId?: string;
      rowsSynced?: number;
    }>(`/jobs/${jobId}`);
    const wasRunning = ["pending", "running"].includes(String(before?.status ?? ""));

    if (!wasRunning) {
      return {
        jobId,
        status: before?.status,
        wasRunning: false,
        connectionId: before?.connectionId,
        rowsSynced: before?.rowsSynced,
        cancelled: false,
      };
    }

    const job = await client.request<{ status?: string; rowsSynced?: number }>(`/jobs/${jobId}`, {
      method: "DELETE",
    });

    ctx.log(
      "warn",
      "cancelled a running sync — whatever had already been written to the destination is still " +
        "there, and the way forward is another sync rather than a rollback",
      { jobId },
    );

    return {
      jobId,
      status: job?.status ?? "cancelled",
      wasRunning: true,
      connectionId: before?.connectionId,
      rowsSynced: job?.rowsSynced ?? before?.rowsSynced,
      cancelled: true,
    };
  },
};

export default action;
