import type { ActionDefinition } from "@w6w/types";
import { AirbyteClient, csv, query } from "../lib/client.ts";

/**
 * `GET /v1/sources` — where the data comes from.
 *
 * ## Every one of these holds a credential to somebody else's system
 *
 * A source is a configured connector: a Postgres with its password, a
 * Salesforce with its OAuth grant, an S3 bucket with its keys. Airbyte is
 * therefore a concentration of credentials by design, and a list of sources is
 * a list of the systems one compromise would reach.
 *
 * Airbyte does not return the secrets — the configuration comes back with them
 * masked — but the *inventory* is worth having, and it is what this returns.
 *
 * ## `sourceType` is the connector, and versions matter
 *
 * Connectors are versioned independently of Airbyte, and a source pinned to an
 * old connector version behaves differently from the documentation for the
 * current one. That is the usual explanation for "the API changed and our sync
 * did not notice".
 */
const action: ActionDefinition = {
  key: "source-list",
  type: "search",
  resource: "source",
  title: "List sources",
  description:
    "Where the data comes from. Each source holds a credential to somebody else's system, so " +
    "this list is also the inventory of what one compromise of Airbyte would reach — the " +
    "secrets themselves come back masked.",
  params: [
    {
      key: "workspaceIds",
      label: "Workspace IDs",
      type: "string",
      default: "",
      hint: "Comma-separated.",
    },
    {
      key: "sourceType",
      label: "Connector type",
      type: "string",
      default: "",
      placeholder: "postgres",
      hint: "Filtered here, since Airbyte returns every type.",
    },
    { key: "limit", label: "Limit", type: "number", default: 100 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "sources", type: "array", label: "The sources" },
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
        sourceId?: string;
        name?: string;
        sourceType?: string;
        workspaceId?: string;
        createdAt?: number;
      }>;
    }>("/sources", {
      query: query({
        workspaceIds: csv(p.workspaceIds)?.join(","),
        limit: Math.max(1, Math.min(1000, Number(p.limit ?? 100))),
        offset: Math.max(0, Number(p.offset ?? 0)),
      }),
    });

    const all = body?.data ?? [];
    const wanted = String(p.sourceType ?? "").trim().toLowerCase();
    const sources = wanted
      ? all.filter((source) => String(source?.sourceType ?? "").toLowerCase() === wanted)
      : all;

    const byType: Record<string, number> = {};
    for (const source of sources) {
      const type = String(source?.sourceType ?? "unknown");
      byType[type] = (byType[type] ?? 0) + 1;
    }

    return {
      sources: sources.map((source) => ({
        sourceId: source?.sourceId,
        name: source?.name,
        sourceType: source?.sourceType,
        workspaceId: source?.workspaceId,
      })),
      count: sources.length,
      ids: sources.map((source) => source?.sourceId).filter(Boolean),
      names: sources.map((source) => source?.name).filter(Boolean),
      byType,
      types: Object.keys(byType).sort(),
    };
  },
};

export default action;
