import type { ActionDefinition } from "@w6w/types";
import { AirbyteClient, assertUuid } from "../lib/client.ts";

/**
 * `POST /v1/jobs` with `jobType: "reset"` — throw away the destination data
 * and start again.
 *
 * ## One word away from a normal sync, and it deletes
 *
 * The same endpoint and the same body as `sync-trigger`, with `reset` instead
 * of `sync`. It **clears the connection's data in the destination** and wipes
 * the incremental state, so the next sync re-reads everything from the source.
 *
 * That is why it is a separate action here rather than a parameter: the two
 * differ by a string in a payload, and only one of them is destructive.
 *
 * ## What it is legitimately for
 *
 * Changing a stream's sync mode or primary key, recovering from a corrupted
 * incremental cursor, or a source whose history has been rewritten. In all
 * three the destination data is known to be wrong, which is the only condition
 * under which throwing it away is the cheap option.
 *
 * ## The cost lands on the source
 *
 * A reset is followed by a full re-read: every row, every API call, every byte
 * of a warehouse scan. On a rate-limited source that can take days, and on a
 * metered one it is a bill. Nothing about the reset itself says so.
 */
const action: ActionDefinition = {
  key: "sync-reset",
  type: "perform",
  resource: "job",
  title: "Reset a connection",
  description:
    "DESTRUCTIVE. Clears the connection's data in the destination and wipes its incremental " +
    "state, so the next sync re-reads everything from the source — which on a rate-limited " +
    "source is days and on a metered one is a bill. One word apart from a normal sync.",
  idempotent: false,
  params: [
    { key: "connectionId", label: "Connection ID", type: "string", required: true, default: "" },
    {
      key: "confirm",
      label: "Confirm",
      type: "boolean",
      default: false,
      required: true,
      hint: "The destination's data for this connection is deleted, and the next sync re-reads " +
        "the source in full.",
    },
  ],
  output: [
    { key: "jobId", type: "number", label: "The reset job" },
    { key: "status", type: "string", label: "Where it starts" },
    { key: "connectionId", type: "string", label: "Which pipeline" },
    { key: "connectionName", type: "string", label: "What it is called" },
    { key: "streamCount", type: "number", label: "How many streams will be re-read" },
    { key: "reset", type: "boolean", label: "Whether the reset was started" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const connectionId = assertUuid(p.connectionId, "connectionId");
    if (p.confirm !== true) {
      throw new Error(
        "set `confirm` to reset this connection. It DELETES the data this connection has " +
          "written to the destination and clears its incremental state, so the next sync reads " +
          "the whole source again — which is the expensive half, and lands on the source rather " +
          "than on Airbyte",
      );
    }

    const client = new AirbyteClient(ctx);
    const connection = await client.request<{
      name?: string;
      configurations?: { streams?: unknown[] };
    }>(`/connections/${encodeURIComponent(connectionId)}`);

    const job = await client.request<{ jobId?: number; status?: string }>("/jobs", {
      method: "POST",
      body: { connectionId, jobType: "reset" },
    });

    ctx.log(
      "warn",
      "started a RESET — the destination's data for this connection is being cleared, and the " +
        "next sync will re-read the source in full",
      { connectionId, jobId: job?.jobId },
    );

    return {
      jobId: job?.jobId,
      status: job?.status,
      connectionId,
      connectionName: connection?.name,
      streamCount: (connection?.configurations?.streams ?? []).length,
      reset: true,
    };
  },
};

export default action;
