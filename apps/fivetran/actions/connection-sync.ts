import type { ActionDefinition } from "@w6w/types";
import { compact, FivetranClient } from "../lib/client.ts";

/**
 * `POST /v1/connections/{id}/sync` — pull whatever is new, now.
 *
 * The cheap one. An incremental sync reads the source's changes since the last
 * run, which is what the schedule does anyway — this just does not wait for it.
 *
 * The workflow this is built for: something upstream finished and the warehouse
 * should reflect it before the next scheduled run. Pair it with a dbt job and
 * the whole chain is *sync → transform → notify*.
 *
 * ## It does not wait, and it does not change the schedule
 *
 * The call returns as soon as the sync is **queued**. Nothing has been loaded
 * when it comes back, so a workflow that treats a successful trigger as fresh
 * data is asserting something it has not checked — `connection-get` reading
 * `status.sync_state` is the other half.
 *
 * Fivetran is explicit that this does not override the configured frequency.
 * The exception is a connection whose `schedule_type` is `manual`, where **this
 * endpoint is the only way a sync ever happens**.
 *
 * ## `force` stops a running sync
 *
 * Without it, triggering a connection that is already syncing does nothing —
 * which is usually right. With it, Fivetran stops the running sync and starts
 * again, throwing away the work in progress. That is occasionally what you
 * want and rarely what you meant.
 */
const action: ActionDefinition = {
  key: "connection-sync",
  type: "perform",
  resource: "connection",
  title: "Sync a connection",
  description:
    "Trigger an incremental sync now. It returns when the sync is QUEUED, not when data has " +
    "landed — poll `connection-get` for that.",
  idempotent: false,
  params: [
    { key: "connectionId", label: "Connection ID", type: "string", required: true, default: "" },
    {
      key: "force",
      label: "Force",
      type: "boolean",
      default: false,
      hint: "Stops a sync already in progress and starts again, discarding its work. Without " +
        "this, triggering a busy connection does nothing — which is usually what you want.",
    },
  ],
  output: [
    { key: "queued", type: "boolean", label: "The sync was accepted — not that it finished" },
    { key: "message", type: "string", label: "Fivetran's own wording" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const connectionId = String(p.connectionId ?? "").trim();
    if (!connectionId) throw new Error("`connectionId` is required");

    await new FivetranClient(ctx).request(
      `/v1/connections/${encodeURIComponent(connectionId)}/sync`,
      { method: "POST", body: compact({ force: p.force === true ? true : undefined }) },
    );

    ctx.log("info", "queued a Fivetran sync", { connectionId, force: p.force === true });
    // Queued, not finished — saying otherwise would be a lie a workflow acts on.
    return { queued: true };
  },
};

export default action;
