import type { ActionDefinition } from "@w6w/types";
import { FivetranClient } from "../lib/client.ts";

/**
 * `PATCH /v1/connections/{id}` with `paused` — stop or restart a pipeline.
 *
 * ## Pausing costs nothing and skipping does not exist
 *
 * There is no "skip the next sync". Pausing is how a workflow says *not now*:
 * before a warehouse migration, during a source system's maintenance window, or
 * when a downstream table is being rebuilt and fresh rows would collide.
 *
 * ## Resuming does not resume where it stopped — it catches up
 *
 * A connection paused for a week and then resumed reads everything that changed
 * during that week, in one sync. That is correct and it is also a much larger
 * sync than usual, on a source that has had a week to accumulate. Pausing over
 * a long weekend is fine; pausing for a month and then unpausing on a Monday
 * morning is a decision worth making deliberately.
 *
 * Fivetran requires at least one persistent parameter on this endpoint, which
 * `paused` is — so this action does exactly one thing rather than becoming a
 * general connection editor.
 */
const action: ActionDefinition = {
  key: "connection-pause",
  type: "perform",
  resource: "connection",
  title: "Pause or resume a connection",
  description:
    "Stop or restart a pipeline. Resuming catches up everything that changed while it was " +
    "paused, in one sync — which after a long pause is a much larger sync than usual.",
  idempotent: true,
  params: [
    { key: "connectionId", label: "Connection ID", type: "string", required: true, default: "" },
    {
      key: "paused",
      label: "Paused",
      type: "boolean",
      required: true,
      default: true,
      hint: "True stops syncing; false resumes and catches up.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Connection ID" },
    { key: "paused", type: "boolean", label: "State after the change" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const connectionId = String(p.connectionId ?? "").trim();
    if (!connectionId) throw new Error("`connectionId` is required");
    const paused = p.paused === undefined ? true : p.paused === true;

    const connection = await new FivetranClient(ctx).request(
      `/v1/connections/${encodeURIComponent(connectionId)}`,
      { method: "PATCH", body: { paused } },
    );

    ctx.log("info", paused ? "paused a Fivetran connection" : "resumed a Fivetran connection", {
      connectionId,
    });
    return connection;
  },
};

export default action;
