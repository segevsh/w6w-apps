import type { ActionDefinition } from "@w6w/types";
import { CodaClient, type CodaListResponse } from "../lib/client.ts";

interface Input {
  docId: string;
  tableId: string;
  query?: string;
  sortBy?: "createdAt" | "natural";
  useColumnNames?: boolean;
  valueFormat?: "simple" | "simpleWithArrays" | "rich";
  visibleOnly?: boolean;
  limit?: number;
  pageToken?: string;
}

interface Row {
  id: string;
  type: string;
  href: string;
  name: string;
  index?: number;
  values: Record<string, unknown>;
}

/**
 * GET /docs/{docId}/tables/{tableIdOrName}/rows
 *
 * `query` filters as `<column_id_or_name>:<value>` where `value` is a JSON
 * value (quote it for a string: `"My Column":"Done"`). Documented directly on
 * this endpoint, not something the app is inventing.
 */
const listRows: ActionDefinition<Input, CodaListResponse<Row>> = {
  key: "list-rows",
  type: "read",
  resource: "row",
  title: "List Rows",
  description: "Query the rows in a table. Returns one page — pass `pageToken` back to walk.",
  params: [
    { key: "docId", label: "Doc ID", type: "string", required: true },
    {
      key: "tableId",
      label: "Table ID or name",
      type: "string",
      required: true,
      hint: "Table ID (preferred) or name.",
    },
    {
      key: "query",
      label: "Query",
      type: "string",
      hint: 'Filter as `<column>:<value>`, e.g. `c-abc123:"Done"`. Value is a JSON literal.',
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "natural", label: "Natural (table order)" },
        { value: "createdAt", label: "Created at" },
      ],
    },
    {
      key: "useColumnNames",
      label: "Use column names",
      type: "boolean",
      default: true,
      hint: "Key `values` by column name instead of column ID. Fragile if columns get renamed.",
    },
    {
      key: "valueFormat",
      label: "Value format",
      type: "select",
      options: [
        { value: "simple", label: "Simple" },
        { value: "simpleWithArrays", label: "Simple with arrays" },
        { value: "rich", label: "Rich" },
      ],
    },
    { key: "visibleOnly", label: "Visible rows/columns only", type: "boolean" },
    { key: "limit", label: "Page size", type: "number", default: 25 },
    { key: "pageToken", label: "Page token", type: "string" },
  ],
  output: [
    { key: "items", type: "array", label: "Rows" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    const client = new CodaClient(ctx);
    return client.request<CodaListResponse<Row>>(
      `/docs/${input.docId}/tables/${input.tableId}/rows`,
      {
        query: {
          query: input.query,
          sortBy: input.sortBy,
          useColumnNames: input.useColumnNames ?? true,
          valueFormat: input.valueFormat,
          visibleOnly: input.visibleOnly,
          limit: input.limit ?? 25,
          pageToken: input.pageToken,
        },
      },
    );
  },
};

export default listRows;
