import type { ActionDefinition } from "@w6w/types";
import { NocoDBClient } from "../lib/client.ts";

/**
 * `GET /api/v2/meta/bases/{baseId}/tables` — the tables in a base, and their
 * ids.
 *
 * ## The id is what every data action takes, and it is not the name
 *
 * NocoDB's table ids look like `m1a2b3c4d5e6f7g`. Every record endpoint takes
 * one, and nothing accepts a table's title — so this is the first call a
 * workflow makes, and the ids are worth storing rather than looking up each
 * run.
 *
 * They also survive a rename, which titles do not. A workflow keyed on the
 * title breaks the day somebody tidies the base; one keyed on the id does not.
 *
 * ## An empty base is not an error
 *
 * A base with no tables returns an empty list. So does a base id that exists
 * and this token cannot see into — those two are only distinguishable by the
 * 404 the second sometimes gives instead.
 */
const action: ActionDefinition = {
  key: "table-list",
  type: "read",
  resource: "table",
  title: "List tables",
  description:
    "The tables in a base with their IDS — which is what every record action takes, since " +
    "nothing accepts a table's title. Ids survive a rename, so a workflow keyed on one does not " +
    "break the day somebody tidies the base.",
  params: [
    {
      key: "baseId",
      label: "Base ID",
      type: "string",
      required: true,
      default: "",
      hint: "From `base-list`.",
    },
  ],
  output: [
    { key: "tables", type: "array", label: "The tables" },
    { key: "count", type: "number", label: "How many" },
    { key: "titles", type: "array", label: "Just the names" },
    { key: "ids", type: "array", label: "The ids every record action takes" },
    { key: "byTitle", type: "object", label: "Title to id, ready to look up" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const baseId = String(p.baseId ?? "").trim();
    if (!baseId) throw new Error("`baseId` is required");

    const body = await new NocoDBClient(ctx).request<{
      list?: Array<{
        id?: string;
        title?: string;
        table_name?: string;
        type?: string;
        meta?: unknown;
      }>;
    }>(`/api/v2/meta/bases/${encodeURIComponent(baseId)}/tables`);

    const tables = body?.list ?? [];

    // The lookup a caller actually wants, rather than an array to walk.
    const byTitle: Record<string, string> = {};
    for (const table of tables) {
      if (table?.title && table?.id) byTitle[table.title] = table.id;
    }

    return {
      tables: tables.map((table) => ({
        id: table?.id,
        title: table?.title,
        tableName: table?.table_name,
        type: table?.type,
      })),
      count: tables.length,
      titles: tables.map((table) => table?.title).filter(Boolean),
      ids: tables.map((table) => table?.id).filter(Boolean),
      byTitle,
    };
  },
};

export default action;
