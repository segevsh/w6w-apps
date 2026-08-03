import type { ActionDefinition } from "@w6w/types";
import { GristClient } from "../lib/client.ts";

interface Input {
  docId: string;
  tableId: string;
  hidden?: boolean;
}

interface Output {
  columns?: Array<{ id: string; fields: Record<string, unknown> }>;
}

/**
 * `GET /docs/{docId}/tables/{tableId}/columns`.
 *
 * The `id` of each column is what goes in a `filter` key, a `fields` key or a
 * SQL statement — Grist's `label` is the human name and the two diverge as soon
 * as anyone renames a column in the UI without unlinking the id.
 *
 * `?hidden=true` adds Grist's internal columns, of which `manualSort` is the one
 * worth knowing: it is the column `list-records`' `sort=manualSort` refers to.
 */
const listColumns: ActionDefinition<Input, Output> = {
  key: "list-columns",
  type: "read",
  resource: "column",
  title: "List Columns",
  description:
    "List a table's columns with their IDs, labels, types and formulas — the vocabulary every other record call uses.",
  params: [
    { key: "docId", label: "Document ID", type: "string", required: true },
    { key: "tableId", label: "Table ID", type: "string", required: true },
    {
      key: "hidden",
      label: "Include hidden columns",
      type: "boolean",
      default: false,
      hint: "Adds Grist internals such as `manualSort`.",
    },
  ],
  output: [
    { key: "columns", type: "array", label: "Columns" },
  ],

  execute(input, ctx) {
    const client = GristClient.fromConnection(ctx);
    return client.request<Output>(
      `/docs/${encodeURIComponent(input.docId)}/tables/${
        encodeURIComponent(input.tableId)
      }/columns`,
      { query: { hidden: input.hidden } },
    );
  },
};

export default listColumns;
