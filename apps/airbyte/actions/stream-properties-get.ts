import type { ActionDefinition } from "@w6w/types";
import { AirbyteClient, assertUuid, query } from "../lib/client.ts";

/**
 * `GET /v1/streams` — what a source offers, and what each stream is *capable*
 * of.
 *
 * ## Sync modes are a property of the stream, not a preference
 *
 * A stream can only sync incrementally if the connector exposes a cursor for
 * it. So "make this incremental" is sometimes a configuration change and
 * sometimes impossible, and the difference is here in `syncModes` rather than
 * in anything the UI says about the connection.
 *
 * That is the useful question this answers: before changing a connection's
 * sync mode, what will it actually accept?
 *
 * ## `defaultCursorField` and `sourceDefinedPrimaryKey` are the connector's
 *
 * When a connector defines them, they cannot be overridden — the source knows
 * which column marks progress. When it does not, somebody has to choose, and
 * choosing a non-monotonic column is how an incremental sync starts missing
 * rows quietly.
 *
 * ## This is a source-and-destination question
 *
 * The endpoint takes both, because what a stream can do depends on what the
 * destination supports as well. A destination without deduplication cannot
 * offer `incremental_deduped_history` however good the source's cursor is.
 */
const action: ActionDefinition = {
  key: "stream-properties-get",
  type: "read",
  resource: "stream",
  title: "Get stream properties",
  description:
    "What a source's streams are CAPABLE of, against a given destination — so 'make this " +
    "incremental' can be answered before it is attempted. A stream syncs incrementally only if " +
    "the connector exposes a cursor, and that is a fact about the connector.",
  params: [
    {
      key: "sourceId",
      label: "Source ID",
      type: "string",
      required: true,
      default: "",
      hint: "From `source-list`.",
    },
    {
      key: "destinationId",
      label: "Destination ID",
      type: "string",
      default: "",
      hint: "What a stream may do depends on the destination too — one without deduplication " +
        "cannot offer a deduplicated sync mode.",
    },
  ],
  output: [
    { key: "streams", type: "array", label: "Every stream, with what it supports" },
    { key: "count", type: "number", label: "How many streams the source offers" },
    { key: "names", type: "array", label: "Just the names" },
    { key: "incrementalCapable", type: "array", label: "Streams that can sync incrementally" },
    { key: "fullRefreshOnly", type: "array", label: "Streams that must be re-read in full" },
    {
      key: "sourceDefinedCursors",
      type: "array",
      label: "Streams where the cursor is not a choice",
    },
    {
      key: "needsCursorChoice",
      type: "array",
      label: "Incremental, and somebody must pick a cursor",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const sourceId = assertUuid(p.sourceId, "sourceId");
    const destinationId = String(p.destinationId ?? "").trim();
    if (destinationId) assertUuid(destinationId, "destinationId");

    const body = await new AirbyteClient(ctx).request<
      Array<{
        streamName?: string;
        syncModes?: string[];
        defaultCursorField?: string[];
        sourceDefinedCursorField?: boolean;
        sourceDefinedPrimaryKey?: string[][];
        propertyFields?: string[][];
      }>
    >("/streams", { query: query({ sourceId, destinationId }) });

    const streams = Array.isArray(body) ? body : [];
    const supportsIncremental = (stream: { syncModes?: string[] }) =>
      (stream?.syncModes ?? []).some((mode) => String(mode).startsWith("incremental"));

    const incrementalCapable = streams.filter(supportsIncremental);

    // Incremental, and the connector does not say which column marks
    // progress — so somebody picks, and picking wrong loses rows silently.
    const needsCursorChoice = incrementalCapable.filter((stream) =>
      stream?.sourceDefinedCursorField !== true && !(stream?.defaultCursorField ?? []).length
    );
    if (needsCursorChoice.length) {
      ctx.log(
        "info",
        "some streams can sync incrementally but define no cursor, so a person chooses one — " +
          "and a column that is not strictly increasing loses rows without any error",
        { streams: needsCursorChoice.length },
      );
    }

    return {
      streams: streams.map((stream) => ({
        name: stream?.streamName,
        syncModes: stream?.syncModes ?? [],
        defaultCursorField: stream?.defaultCursorField ?? [],
        cursorIsSourceDefined: stream?.sourceDefinedCursorField === true,
        hasSourceDefinedPrimaryKey: (stream?.sourceDefinedPrimaryKey ?? []).length > 0,
        fieldCount: (stream?.propertyFields ?? []).length,
      })),
      count: streams.length,
      names: streams.map((stream) => stream?.streamName).filter(Boolean),
      incrementalCapable: incrementalCapable.map((stream) => stream?.streamName).filter(Boolean),
      fullRefreshOnly: streams
        .filter((stream) => !supportsIncremental(stream))
        .map((stream) => stream?.streamName)
        .filter(Boolean),
      sourceDefinedCursors: streams
        .filter((stream) => stream?.sourceDefinedCursorField === true)
        .map((stream) => stream?.streamName)
        .filter(Boolean),
      needsCursorChoice: needsCursorChoice.map((stream) => stream?.streamName).filter(Boolean),
    };
  },
};

export default action;
