import type { ActionDefinition } from "@w6w/types";
import { CodaClient, type CodaListResponse } from "../lib/client.ts";

interface Input {
  docId: string;
  tableId: string;
  limit?: number;
  pageToken?: string;
}

interface Column {
  id: string;
  type: string;
  href: string;
  name: string;
}

/** GET /docs/{docId}/tables/{tableIdOrName}/columns */
const listColumns: ActionDefinition<Input, CodaListResponse<Column>> = {
  key: "list-columns",
  type: "read",
  resource: "column",
  title: "List Columns",
  description: "List the columns of a table. Returns one page — pass `pageToken` back to walk.",
  params: [
    { key: "docId", label: "Doc ID", type: "string", required: true },
    {
      key: "tableId",
      label: "Table ID or name",
      type: "string",
      required: true,
      hint: "Table ID (preferred) or name.",
    },
    { key: "limit", label: "Page size", type: "number", default: 25 },
    { key: "pageToken", label: "Page token", type: "string" },
  ],
  output: [
    { key: "items", type: "array", label: "Columns" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    const client = new CodaClient(ctx);
    return client.request<CodaListResponse<Column>>(
      `/docs/${input.docId}/tables/${input.tableId}/columns`,
      { query: { limit: input.limit ?? 25, pageToken: input.pageToken } },
    );
  },
};

export default listColumns;
