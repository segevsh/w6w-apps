import type { ActionDefinition } from "@w6w/types";
import { AirbyteClient, isJobHealthy, jobDurationSeconds } from "../lib/client.ts";

/**
 * `GET /v1/jobs/{jobId}` — how one sync actually went.
 *
 * ## This is the half of `sync-trigger` that means anything
 *
 * Triggering returns a pending job. Whether the data arrived is only knowable
 * here, minutes later, which makes this the action a workflow polls after a
 * trigger — and the reason `sync-trigger` returns the job id.
 *
 * ## Finished is not the same as fine
 *
 * A job is over when its status is not `pending` or `running`. Whether it
 * *worked* is a separate question with three wrong answers: `failed`,
 * `cancelled`, and `incomplete` — the last being a sync where some streams
 * landed and others did not. This action returns both booleans rather than one
 * status string, because collapsing them is exactly the mistake.
 *
 * ## `rowsSynced` is not a row count of the destination
 *
 * It is the number of records this job moved. On an incremental connection
 * that is the change since last time, and a healthy sync moving zero rows
 * usually means nothing changed rather than that something broke.
 */
const action: ActionDefinition = {
  key: "job-get",
  type: "read",
  resource: "job",
  title: "Get a job",
  description:
    "How one sync went — the half of a trigger that means anything. Returns FINISHED and " +
    "SUCCEEDED as separate answers, because a job can be over and still be `incomplete`, which " +
    "is a sync missing some of its streams.",
  params: [
    {
      key: "jobId",
      label: "Job ID",
      type: "number",
      required: true,
      default: 0,
      hint: "From `sync-trigger` or `job-list`. Job ids are numbers, unlike every other id here.",
    },
  ],
  output: [
    { key: "job", type: "object", label: "The job" },
    { key: "status", type: "string", label: "Its status" },
    { key: "jobType", type: "string", label: "sync or reset" },
    { key: "finished", type: "boolean", label: "Whether it has stopped running" },
    { key: "succeeded", type: "boolean", label: "Whether it moved everything" },
    { key: "incomplete", type: "boolean", label: "Some streams landed and others did not" },
    { key: "rowsSynced", type: "number", label: "Records this job moved" },
    { key: "durationSeconds", type: "number", label: "How long it took" },
    { key: "connectionId", type: "string", label: "Which pipeline" },
    { key: "startTime", type: "string", label: "When it began" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const jobId = Number(p.jobId ?? 0);
    if (!Number.isInteger(jobId) || jobId <= 0) {
      throw new Error("`jobId` must be the numeric id `sync-trigger` and `job-list` report");
    }

    const job = await new AirbyteClient(ctx).request<{
      jobId?: number;
      status?: string;
      jobType?: string;
      connectionId?: string;
      startTime?: string;
      lastUpdatedAt?: string;
      rowsSynced?: number;
      failureReason?: { externalMessage?: string; failureType?: string };
    }>(`/jobs/${jobId}`);

    const status = String(job?.status ?? "");
    const finished = !["pending", "running"].includes(status);
    const succeeded = isJobHealthy(status);
    const incomplete = status === "incomplete";

    if (incomplete) {
      ctx.log(
        "warn",
        "this job finished INCOMPLETE — some streams synced and others did not, so the " +
          "destination has part of the data and nothing marks which part",
        { jobId },
      );
    } else if (finished && !succeeded) {
      ctx.log("warn", `this job ended ${status}`, {
        jobId,
        reason: job?.failureReason?.failureType,
      });
    }

    return {
      job,
      status,
      jobType: job?.jobType,
      finished,
      // Deliberately two answers: a job can be over and not fine.
      succeeded,
      incomplete,
      rowsSynced: job?.rowsSynced,
      durationSeconds: jobDurationSeconds(job ?? {}),
      connectionId: job?.connectionId,
      startTime: job?.startTime,
    };
  },
};

export default action;
