import type { ActionDefinition } from "@w6w/types";
import { AirbyteClient, assertUuid } from "../lib/client.ts";

/**
 * `POST /v1/jobs` with `jobType: "sync"` — move the data now.
 *
 * ## This is the action the app exists for
 *
 * The natural shape is: something upstream finishes, a workflow triggers the
 * sync, and the warehouse has the new data before anybody asks for it. That
 * beats a schedule set to run often enough to feel fresh, which is how most
 * pipelines end up costing more than they need to.
 *
 * ## It returns immediately, and the sync has not happened
 *
 * The response is a job in `pending` or `running`. Everything interesting —
 * whether it worked, how many rows moved — arrives minutes later, through
 * `job-get`. A workflow that triggers and proceeds is asserting nothing about
 * the data.
 *
 * ## One job per connection, and a second request is refused
 *
 * Airbyte will not queue a sync behind a running one; the second call is a
 * **409**. That is usually the right behaviour and it means "trigger on every
 * event" needs to expect the conflict rather than treat it as an error — so
 * this action reports it as a state rather than throwing.
 *
 * ## An inactive connection can still be triggered
 *
 * A paused connection accepts a manual sync. Which is occasionally exactly
 * what you want — a one-off backfill of something deliberately not scheduled
 * — and occasionally a workflow quietly working around a pause somebody put
 * there on purpose. It is reported either way.
 */
const action: ActionDefinition = {
  key: "sync-trigger",
  type: "perform",
  resource: "job",
  title: "Trigger a sync",
  description:
    "Start a sync now — the point of driving Airbyte from a workflow rather than a schedule. It " +
    "RETURNS IMMEDIATELY with a pending job, so nothing about the data is true yet. A sync " +
    "already running is reported as a state, not thrown, because Airbyte refuses rather than queues.",
  idempotent: false,
  params: [
    { key: "connectionId", label: "Connection ID", type: "string", required: true, default: "" },
    {
      key: "failIfRunning",
      label: "Fail if a sync is already running",
      type: "boolean",
      default: false,
      hint: "Off — the default — reports the conflict as `alreadyRunning` instead, which is what " +
        "an event-driven trigger usually wants.",
    },
  ],
  output: [
    { key: "jobId", type: "number", label: "The job to watch with `job-get`" },
    { key: "status", type: "string", label: "pending or running — never a result" },
    { key: "connectionId", type: "string", label: "Which pipeline" },
    { key: "started", type: "boolean", label: "Whether a new job was created" },
    { key: "alreadyRunning", type: "boolean", label: "A sync was already going" },
    { key: "connectionWasInactive", type: "boolean", label: "Triggered a paused connection" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const connectionId = assertUuid(p.connectionId, "connectionId");
    const client = new AirbyteClient(ctx);

    // Worth reporting: a paused connection still accepts a manual sync.
    let connectionWasInactive = false;
    try {
      const connection = await client.request<{ status?: string }>(
        `/connections/${encodeURIComponent(connectionId)}`,
      );
      connectionWasInactive = connection?.status === "inactive";
    } catch { /* the trigger is the point; this is context */ }

    if (connectionWasInactive) {
      ctx.log(
        "warn",
        "this connection is INACTIVE and Airbyte will run the sync anyway — which is either a " +
          "deliberate one-off or a workflow working around a pause somebody meant",
        { connectionId },
      );
    }

    let job: { jobId?: number; status?: string } | undefined;
    let alreadyRunning = false;
    try {
      job = await client.request<{ jobId?: number; status?: string }>("/jobs", {
        method: "POST",
        body: { connectionId, jobType: "sync" },
      });
    } catch (err) {
      const message = String(err instanceof Error ? err.message : err);
      // Airbyte runs one job per connection and refuses the second.
      if (/409|ALREADY RUNNING/i.test(message) && p.failIfRunning !== true) {
        alreadyRunning = true;
      } else {
        throw err;
      }
    }

    return {
      jobId: job?.jobId,
      status: job?.status,
      connectionId,
      started: !alreadyRunning && Boolean(job?.jobId),
      alreadyRunning,
      connectionWasInactive,
    };
  },
};

export default action;
