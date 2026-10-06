import type { ActionDefinition } from "@w6w/types";
import { SeaTableClient } from "../lib/client.ts";
import { asStringArray, tableNameParam } from "../lib/params.ts";

interface Input {
  tableName: string;
  linkColumnName: string;
  rowIds: unknown;
  offset?: number;
  limit?: number;
}

const rowLinkList: ActionDefinition<Input> = {
  key: "row-link-list",
  type: "read",
  resource: "link",
  title: "List Row Links",
  description:
    "The records linked to each of the given rows through one link column. The answer is an " +
    "object keyed by row ID, each holding `{row_id, display_value}` entries. Up to 10 linked " +
    "records per row are returned unless a Limit is given.",
  params: [
    tableNameParam,
    {
      key: "linkColumnName",
      label: "Link column name",
      type: "string",
      required: true,
      hint: "The link column's NAME (not its key, and not its link_id).",
    },
    {
      key: "rowIds",
      label: "Row IDs",
      type: "json",
      required: true,
      hint: "A JSON array of row `_id` values whose links to read.",
    },
    { key: "offset", label: "Offset", type: "number", validation: { min: 0, integer: true } },
    {
      key: "limit",
      label: "Limit per row",
      type: "number",
      validation: { min: 1, integer: true },
      hint: "Linked records returned per row. The vendor default is 10.",
    },
  ],
  output: [{ key: "links", type: "object", label: "Linked records keyed by row ID" }],

  async execute(input, ctx) {
    const rows = asStringArray(input.rowIds, "Row IDs").map((rowId) => {
      const entry: Record<string, unknown> = { row_id: rowId };
      if (input.offset !== undefined) entry.offset = input.offset;
      if (input.limit !== undefined) entry.limit = input.limit;
      return entry;
    });
    const links = await new SeaTableClient(ctx).request("/query-links/", {
      method: "POST",
      body: { table_name: input.tableName, link_column_name: input.linkColumnName, rows },
    });
    return { links };
  },
};

export default rowLinkList;
