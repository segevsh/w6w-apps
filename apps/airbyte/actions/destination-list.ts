import type { ActionDefinition } from "@w6w/types";
import { AirbyteClient, csv, query } from "../lib/client.ts";

/**
 * `GET /v1/destinations` — where the data lands.
 *
 * ## The destination is usually the expensive half
 *
 * Sources are read; destinations are written, stored and queried. A connection
 * pointed at the wrong warehouse is a bill, and one pointed at the wrong
 * *schema* of the right warehouse is a table nobody finds. Both are decided
 * here and in the connection's namespace setting.
 *
 * ## Several connections usually share one destination
 *
 * Which makes a destination the blast radius of a change: altering its
 * configuration affects every pipeline writing through it, and there is
 * nothing in the destination record that lists them. `connection-list` is
 * where that mapping lives, by `destinationId`.
 */
const action: ActionDefinition = {
  key: "destination-list",
  type: "search",
  resource: "destination",
  title: "List destinations",
  description: "Where the data lands — usually the expensive half, and usually shared by several " +
    "connections, which makes a destination the blast radius of any change to it. The mapping " +
    "back to pipelines is in `connection-list`.",
  params: [
    { key: "workspaceIds", label: "Workspace IDs", type: "string", default: "" },
    {
      key: "destinationType",
      label: "Connector type",
      type: "string",
      default: "",
      placeholder: "snowflake",
    },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "destinations", type: "array", label: "The destinations" },
    { key: "count", type: "number", label: "How many came back" },
    { key: "ids", type: "array", label: "Their ids" },
    { key: "names", type: "array", label: "Their names" },
    { key: "byType", type: "object", label: "How many of each connector type" },
    { key: "types", type: "array", label: "The distinct connector types in use" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    const body = await new AirbyteClient(ctx).request<{
      data?: Array<{
        destinationId?: string;
        name?: string;
        destinationType?: string;
        workspaceId?: string;
      }>;
    }>("/destinations", {
      query: query({
        workspaceIds: csv(p.workspaceIds)?.join(","),
        limit: Math.max(1, Math.min(1000, Number(p.limit ?? 100))),
        offset: Math.max(0, Number(p.offset ?? 0)),
      }),
    });

    const all = body?.data ?? [];
    const wanted = String(p.destinationType ?? "").trim().toLowerCase();
    const destinations = wanted
      ? all.filter((destination) =>
        String(destination?.destinationType ?? "").toLowerCase() === wanted
      )
      : all;

    const byType: Record<string, number> = {};
    for (const destination of destinations) {
      const type = String(destination?.destinationType ?? "unknown");
      byType[type] = (byType[type] ?? 0) + 1;
    }

    return {
      destinations: destinations.map((destination) => ({
        destinationId: destination?.destinationId,
        name: destination?.name,
        destinationType: destination?.destinationType,
        workspaceId: destination?.workspaceId,
      })),
      count: destinations.length,
      ids: destinations.map((destination) => destination?.destinationId).filter(Boolean),
      names: destinations.map((destination) => destination?.name).filter(Boolean),
      byType,
      types: Object.keys(byType).sort(),
    };
  },
};

export default action;
