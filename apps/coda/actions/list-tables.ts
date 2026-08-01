import type { ActionDefinition } from "@w6w/types";
import { CodaClient, type CodaListResponse } from "../lib/client.ts";

interface Input {
  docId: string;
  limit?: number;
  pageToken?: string;
}

interface Table {
  id: string;
  type: string;
  href: string;
  name: string;
  tableType?: string;
  rowCount?: number;
}

/** GET /docs/{docId}/tables */
const listTables: ActionDefinition<Input, CodaListResponse<Table>> = {
  key: "list-tables",
  type: "read",
  resource: "table",
  title: "List Tables",
  description:
    "List tables (and views) in a doc. Returns one page — pass `pageToken` back to walk.",
  params: [
    { key: "docId", label: "Doc ID", type: "string", required: true },
    { key: "limit", label: "Page size", type: "number", default: 25 },
    { key: "pageToken", label: "Page token", type: "string" },
  ],
  output: [
    { key: "items", type: "array", label: "Tables" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    const client = new CodaClient(ctx);
    return client.request<CodaListResponse<Table>>(`/docs/${input.docId}/tables`, {
      query: { limit: input.limit ?? 25, pageToken: input.pageToken },
    });
  },
};

export default listTables;
