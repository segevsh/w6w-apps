import type { ActionDefinition } from "@w6w/types";
import { AirbyteClient, assertUuid } from "../lib/client.ts";

/**
 * `GET /v1/connections/{connectionId}` — one pipeline, with its stream
 * configuration.
 *
 * ## The stream configuration is the shape of the data that moves
 *
 * Each stream — a table, an endpoint, a file — has a **sync mode** that
 * decides what happens on every run:
 *
 * - `full_refresh_overwrite` — the destination table is replaced each time.
 * - `full_refresh_append` — everything, appended, so rows accumulate as
 *   duplicates by design.
 * - `incremental_append` — only new rows, appended.
 * - `incremental_deduped_history` — new rows, deduplicated on a primary key.
 *
 * These are not interchangeable, and the difference between the second and the
 * fourth is whether a table doubles every night. It is decided per stream and
 * visible only here.
 *
 * ## `namespaceDefinition` decides where the data lands
 *
 * Whether streams go into the destination's default schema, the source's, or a
 * named one. A connection that looks correct and writes into a schema nobody
 * is querying is this setting.
 */
const action: ActionDefinition = {
  key: "connection-get",
  type: "read",
  resource: "connection",
  title: "Get a connection",
  description:
    "One pipeline with its STREAM CONFIGURATION — the sync mode per stream, which decides " +
    "whether a table is replaced, appended to, or deduplicated. Appending where you meant to " +
    "deduplicate is how a table doubles every night.",
  params: [
    {
      key: "connectionId",
      label: "Connection ID",
      type: "string",
      required: true,
      default: "",
      hint: "From `connection-list`, or the address bar of the Airbyte UI.",
    },
  ],
  output: [
    { key: "connection", type: "object", label: "The connection" },
    { key: "name", type: "string", label: "What it is called" },
    { key: "status", type: "string", label: "active, inactive or deprecated" },
    { key: "isActive", type: "boolean", label: "Whether data is still moving" },
    { key: "sourceId", type: "string", label: "Where it reads from" },
    { key: "destinationId", type: "string", label: "Where it writes to" },
    { key: "scheduleType", type: "string", label: "manual, cron or basic" },
    { key: "streams", type: "array", label: "Every stream, with its sync mode" },
    { key: "streamCount", type: "number", label: "How many streams are selected" },
    { key: "appendOnlyStreams", type: "array", label: "Streams that accumulate duplicates" },
    { key: "namespace", type: "string", label: "Where in the destination the data lands" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const connectionId = assertUuid(p.connectionId, "connectionId");

    const connection = await new AirbyteClient(ctx).request<{
      name?: string;
      status?: string;
      sourceId?: string;
      destinationId?: string;
      schedule?: { scheduleType?: string; cronExpression?: string };
      namespaceDefinition?: string;
      namespaceFormat?: string;
      configurations?: {
        streams?: Array<{
          name?: string;
          syncMode?: string;
          cursorField?: string[];
          primaryKey?: string[][];
        }>;
      };
    }>(`/connections/${encodeURIComponent(connectionId)}`);

    const streams = connection?.configurations?.streams ?? [];

    // `full_refresh_append` and `incremental_append` accumulate: nothing
    // deduplicates, so a re-sync of the same rows doubles the table.
    const appendOnlyStreams = streams
      .filter((stream) => String(stream?.syncMode ?? "").endsWith("_append"))
      .map((stream) => stream?.name)
      .filter(Boolean);

    if (appendOnlyStreams.length) {
      ctx.log(
        "info",
        "some streams sync in an APPEND mode, so re-syncing the same rows adds them again — " +
          "which is correct for an event log and wrong for a table anybody joins on",
        { connectionId, streams: appendOnlyStreams.length },
      );
    }

    return {
      connection,
      name: connection?.name,
      status: connection?.status,
      isActive: connection?.status === "active",
      sourceId: connection?.sourceId,
      destinationId: connection?.destinationId,
      scheduleType: connection?.schedule?.scheduleType,
      streams: streams.map((stream) => ({
        name: stream?.name,
        syncMode: stream?.syncMode,
        cursorField: stream?.cursorField,
        hasPrimaryKey: (stream?.primaryKey ?? []).length > 0,
      })),
      streamCount: streams.length,
      appendOnlyStreams,
      namespace: connection?.namespaceFormat ?? connection?.namespaceDefinition,
    };
  },
};

export default action;
