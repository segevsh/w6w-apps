import type { ActionDefinition } from "@w6w/types";
import { FivetranClient } from "../lib/client.ts";

/**
 * `GET /v1/connections/{id}` — is this pipeline actually working?
 *
 * ## Two states, and they answer different questions
 *
 * **`setup_state`** is whether Fivetran can talk to the source at all:
 * `connected`, `incomplete` (never finished being set up), or **`broken`** (the
 * credentials stopped working). A broken connection does not sync and does not
 * complain — it simply stops, and the warehouse stops changing.
 *
 * **`sync_state`** is what it is doing right now: `scheduled`, `syncing`,
 * `paused`, `rescheduled`. This is the field a workflow polls after
 * `connection-sync`.
 *
 * ## `warnings` is the field nobody reads
 *
 * A connection can be `connected` and `syncing` and still be carrying warnings
 * — a column Fivetran could not map, a schema change it declined to apply. The
 * data is arriving and it is **incomplete**, which is worse than an outage in
 * one specific way: nothing looks wrong.
 *
 * So this returns `healthy` as an explicit boolean, `hasWarnings` separately,
 * and `succeeded_at` / `failed_at` — because "when did this last actually
 * work" is the question behind most of the others.
 */
const action: ActionDefinition = {
  key: "connection-get",
  type: "read",
  resource: "connection",
  title: "Get a connection",
  description:
    "Whether a pipeline works. `setup_state: broken` stops syncing silently, and a connection " +
    "can be syncing happily while carrying warnings that mean the data is incomplete.",
  params: [
    { key: "connectionId", label: "Connection ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Connection ID" },
    { key: "schema", type: "string", label: "The destination schema it writes into" },
    { key: "healthy", type: "boolean", label: "Set up correctly and not broken" },
    { key: "syncing", type: "boolean", label: "A sync is running now" },
    { key: "hasWarnings", type: "boolean", label: "Syncing, with incomplete data" },
    { key: "succeeded_at", type: "string", label: "When it last actually worked" },
    { key: "failed_at", type: "string", label: "When it last failed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const connectionId = String(p.connectionId ?? "").trim();
    if (!connectionId) throw new Error("`connectionId` is required");

    const connection = await new FivetranClient(ctx).request<{
      status?: {
        setup_state?: string;
        sync_state?: string;
        warnings?: unknown[];
        tasks?: unknown[];
      };
    }>(`/v1/connections/${encodeURIComponent(connectionId)}`);

    const status = connection?.status ?? {};
    return {
      ...connection,
      healthy: status.setup_state === "connected",
      syncing: status.sync_state === "syncing",
      hasWarnings: (status.warnings ?? []).length > 0,
      hasTasks: (status.tasks ?? []).length > 0,
    };
  },
};

export default action;
