import type { ActionDefinition } from "@w6w/types";
import { GristClient } from "../lib/client.ts";

interface Input {
  docId: string;
  expand?: boolean;
}

interface Output {
  tables: Array<{
    id: string;
    fields: { tableRef?: number; onDemand?: boolean };
    /** Present only when `expand` is on. */
    columns?: Array<{ id: string; fields: Record<string, unknown> }>;
  }>;
}

/**
 * `GET /docs/{docId}/tables`, optionally `?expand=column`.
 *
 * This is the doc's schema in one call, and the answer to "what do I put in
 * `tableId`?" — the `id` here is the normalized TABLE ID, which is what every
 * record and column endpoint wants, not the display name shown on a page tab.
 *
 * `expand` folds `list-columns` for every table into the same request. It is
 * exposed as a boolean rather than passing Grist's literal `"column"` through,
 * because `column` is the only legal value and a free-text param could only
 * produce a wrong answer.
 */
const listTables: ActionDefinition<Input, Output> = {
  key: "list-tables",
  type: "read",
  resource: "table",
  title: "List Tables",
  description:
    "List a document's tables by their normalized IDs, optionally with every column's metadata inline.",
  params: [
    { key: "docId", label: "Document ID", type: "string", required: true },
    {
      key: "expand",
      label: "Include columns",
      type: "boolean",
      default: false,
      hint: "Adds each table's column metadata inline — the whole schema in one request.",
    },
  ],
  output: [
    { key: "tables", type: "array", label: "Tables" },
  ],

  execute(input, ctx) {
    const client = GristClient.fromConnection(ctx);
    return client.request<Output>(`/docs/${encodeURIComponent(input.docId)}/tables`, {
      // `column` is the only value Grist accepts here.
      query: { expand: input.expand ? "column" : undefined },
    });
  },
};

export default listTables;
