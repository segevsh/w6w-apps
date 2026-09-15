import type { ActionDefinition } from "@w6w/types";
import { BoldSignClient } from "../lib/client.ts";

interface Input {
  page: number;
  pageSize?: number;
  status?: string;
  searchKey?: string;
}

/**
 * `GET /v1/document/list` — the account's documents, newest activity first.
 * `Page` is documented `required` (BoldSign defaults it to `1` but the
 * OpenAPI contract still marks it required, so this action always sends it).
 *
 * BoldSign's own pagination note: beyond 10,000 records a `NextCursor` value
 * (returned alongside each result) is needed instead of `Page` — not
 * implemented here, since every document list this app has verified against
 * fits well under that ceiling.
 */
const documentList: ActionDefinition<Input> = {
  key: "document-list",
  type: "search",
  resource: "document",
  title: "List Documents",
  description: "List the account's documents, optionally filtered by status or a search key.",
  params: [
    { key: "page", label: "Page", type: "number", required: true, default: 1 },
    { key: "pageSize", label: "Page size", type: "number", default: 10 },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "InProgress", label: "In progress" },
        { value: "Completed", label: "Completed" },
        { value: "Declined", label: "Declined" },
        { value: "Expired", label: "Expired" },
        { value: "Revoked", label: "Revoked" },
        { value: "Draft", label: "Draft" },
        { value: "Scheduled", label: "Scheduled" },
      ],
    },
    {
      key: "searchKey",
      label: "Search",
      type: "string",
      hint: "Matches document title, document ID, or a sender/recipient name.",
    },
  ],
  output: [
    { key: "pageDetails", type: "object", label: "Pagination details" },
    { key: "result", type: "array", label: "Documents" },
  ],

  execute(input, ctx) {
    return new BoldSignClient(ctx).request("/document/list", {
      query: {
        Page: input.page,
        PageSize: input.pageSize,
        Status: input.status,
        SearchKey: input.searchKey,
      },
    });
  },
};

export default documentList;
