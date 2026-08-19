import type { ActionDefinition } from "@w6w/types";
import { AirbyteClient, csv, query } from "../lib/client.ts";

/**
 * `GET /v1/connections` — the pipelines, which is what Airbyte actually is.
 *
 * ## A connection is a source, a destination and a schedule
 *
 * Everything else in this API supports that one object. So this is the first
 * call a workflow makes, and the `connectionId` it returns is what every job
 * action takes.
 *
 * ## `status: "inactive"` is a pipeline that has stopped moving data
 *
 * Not an error, not a failure — somebody paused it, or Airbyte disabled it
 * after repeated failures. Either way the destination quietly stops being
 * updated, and nothing in the destination says so. A paused connection is the
 * commonest cause of "the data is stale and nothing is broken", and it is
 * invisible from anywhere except here.
 *
 * `deprecated` is worse: the connection has been deleted and is kept for its
 * history.
 *
 * ## A connection with no schedule only moves when something asks
 *
 * `scheduleType: "manual"` means Airbyte will never run it on its own. That is
 * correct when a workflow drives the sync — which is what `sync-trigger` is
 * for — and a silent bug when somebody expected a schedule.
 */
const action: ActionDefinition = {
  key: "connection-list",
  type: "search",
  resource: "connection",
  title: "List connections",
  description:
    "The pipelines: source, destination and schedule. Separates INACTIVE connections — paused, " +
    "or disabled by Airbyte after repeated failures — which are the commonest cause of 'the " +
    "data is stale and nothing is broken', and MANUAL ones, which never run on their own.",
  params: [
    {
      key: "workspaceIds",
      label: "Workspace IDs",
      type: "string",
      default: "",
      hint: "Comma-separated. Empty means every workspace this application can see.",
    },
    {
      key: "includeDeleted",
      label: "Include deleted connections",
      type: "boolean",
      default: false,
      hint: "Airbyte keeps deleted connections as `deprecated`, for their history.",
    },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "connections", type: "array", label: "The connections" },
    { key: "count", type: "number", label: "How many came back" },
    { key: "ids", type: "array", label: "The connection ids every job action takes" },
    { key: "inactive", type: "array", label: "Paused or disabled — the destination is stale" },
    { key: "manualOnly", type: "array", label: "Never run on their own" },
    { key: "scheduled", type: "number", label: "How many run to a schedule" },
    { key: "byStatus", type: "object", label: "How many in each status" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    const body = await new AirbyteClient(ctx).request<{
      data?: Array<{
        connectionId?: string;
        name?: string;
        status?: string;
        sourceId?: string;
        destinationId?: string;
        workspaceId?: string;
        schedule?: { scheduleType?: string; cronExpression?: string; basicTiming?: string };
      }>;
    }>("/connections", {
      query: query({
        workspaceIds: csv(p.workspaceIds)?.join(","),
        includeDeleted: p.includeDeleted === true,
        limit: Math.max(1, Math.min(1000, Number(p.limit ?? 100))),
        offset: Math.max(0, Number(p.offset ?? 0)),
      }),
    });

    const connections = body?.data ?? [];
    const label = (connection: { name?: string; connectionId?: string }) =>
      connection?.name ?? connection?.connectionId ?? "(unnamed)";

    const byStatus: Record<string, number> = {};
    for (const connection of connections) {
      const status = String(connection?.status ?? "unknown");
      byStatus[status] = (byStatus[status] ?? 0) + 1;
    }

    // A paused connection stops updating its destination and says so nowhere
    // else.
    const inactive = connections.filter((connection) => connection?.status === "inactive");
    if (inactive.length) {
      ctx.log(
        "info",
        "some connections are inactive — paused, or disabled by Airbyte after repeated failures. " +
          "Their destinations stop being updated and nothing in the destination says so",
        { count: inactive.length },
      );
    }

    return {
      connections,
      count: connections.length,
      ids: connections.map((connection) => connection?.connectionId).filter(Boolean),
      inactive: inactive.map(label),
      manualOnly: connections
        .filter((connection) => connection?.schedule?.scheduleType === "manual")
        .map(label),
      scheduled:
        connections.filter((connection) =>
          connection?.schedule?.scheduleType && connection.schedule.scheduleType !== "manual"
        ).length,
      byStatus,
    };
  },
};

export default action;
