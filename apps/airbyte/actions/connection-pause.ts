import type { ActionDefinition } from "@w6w/types";
import { AirbyteClient, assertUuid } from "../lib/client.ts";

/**
 * `PATCH /v1/connections/{connectionId}` with a new `status` — stop a pipeline
 * moving data, or start it again.
 *
 * ## Pausing is the reversible half of deleting a connection
 *
 * An inactive connection keeps its configuration, its stream selection and its
 * incremental state. Resuming picks up where it left off rather than
 * re-reading the source — which is the whole difference from deleting and
 * rebuilding, and the reason to pause rather than delete when a source is
 * being worked on.
 *
 * ## The destination goes stale silently
 *
 * Nothing in the destination marks a table as no longer being updated. A
 * paused connection looks exactly like a working one from the warehouse, and
 * the data simply stops moving — which is why `connection-list` separates
 * inactive connections and why this action is worth using deliberately rather
 * than as a side effect.
 *
 * ## Airbyte pauses connections on its own
 *
 * A connection that fails repeatedly is disabled automatically. So `inactive`
 * is not proof that a person did this, and resuming without knowing why it
 * stopped tends to produce the same failures again.
 */
const action: ActionDefinition = {
  key: "connection-pause",
  type: "perform",
  resource: "connection",
  title: "Pause or resume a connection",
  description:
    "Stop a pipeline moving data, or start it again. Pausing KEEPS the configuration and the " +
    "incremental state, so resuming picks up rather than re-reading. Note Airbyte also pauses " +
    "connections on its own after repeated failures.",
  idempotent: true,
  params: [
    { key: "connectionId", label: "Connection ID", type: "string", required: true, default: "" },
    {
      key: "active",
      label: "Active",
      type: "boolean",
      default: true,
      hint: "Off pauses it. The destination stops being updated, and nothing in the destination " +
        "says so.",
    },
  ],
  output: [
    { key: "connectionId", type: "string", label: "Which pipeline" },
    { key: "name", type: "string", label: "What it is called" },
    { key: "status", type: "string", label: "What it is now" },
    { key: "previousStatus", type: "string", label: "What it was" },
    { key: "changed", type: "boolean", label: "Whether this call changed anything" },
    { key: "scheduleType", type: "string", label: "Whether it would run on its own anyway" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const connectionId = assertUuid(p.connectionId, "connectionId");
    const active = p.active !== false;
    const status = active ? "active" : "inactive";

    const client = new AirbyteClient(ctx);
    const before = await client.request<{
      name?: string;
      status?: string;
      schedule?: { scheduleType?: string };
    }>(`/connections/${encodeURIComponent(connectionId)}`);

    if (before?.status === "deprecated") {
      throw new Error(
        `connection ${connectionId} is deprecated — it has been deleted and is kept only for ` +
          "its history, so it cannot be resumed",
      );
    }

    if (before?.status === status) {
      return {
        connectionId,
        name: before?.name,
        status,
        previousStatus: before?.status,
        changed: false,
        scheduleType: before?.schedule?.scheduleType,
      };
    }

    const updated = await client.request<{ name?: string; status?: string }>(
      `/connections/${encodeURIComponent(connectionId)}`,
      { method: "PATCH", body: { status } },
    );

    if (!active) {
      ctx.log(
        "warn",
        "paused a connection — its destination stops being updated, and nothing in the " +
          "destination marks the tables as stale",
        { connectionId },
      );
    } else if (before?.status === "inactive") {
      ctx.log(
        "info",
        "resumed a connection. If Airbyte paused it after repeated failures rather than a " +
          "person doing so, the same failures are likely to follow",
        { connectionId },
      );
    }

    return {
      connectionId,
      name: updated?.name ?? before?.name,
      status: updated?.status ?? status,
      previousStatus: before?.status,
      changed: true,
      scheduleType: before?.schedule?.scheduleType,
    };
  },
};

export default action;
