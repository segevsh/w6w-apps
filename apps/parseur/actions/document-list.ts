import type { ActionDefinition } from "@w6w/types";
import { encodeId, ParseurClient, type ParseurListPage } from "../lib/client.ts";
import { documentStatusOptions, mailboxIdParam, paginationQuery } from "../lib/params.ts";

/**
 * `GET /parser/{id}/document_set` — the documents a mailbox has received.
 *
 * `withResult` maps to the vendor's `with_result=true`, which is the only way
 * to get each document's parsed `result` string inline in the list — without
 * it, `document-get` is needed per document.
 */
interface Input {
  mailboxId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  ordering?: string;
  status?: string;
  receivedAfter?: string;
  receivedBefore?: string;
  timezone?: string;
  withResult?: boolean;
}

const orderingOptions = [
  { value: "name", label: "Name (A→Z)" },
  { value: "-name", label: "Name (Z→A)" },
  { value: "created", label: "Created (oldest first)" },
  { value: "-created", label: "Created (newest first)" },
  { value: "processed", label: "Processed (oldest first)" },
  { value: "-processed", label: "Processed (newest first)" },
  { value: "status", label: "Status (A→Z)" },
  { value: "-status", label: "Status (Z→A)" },
];

const documentList: ActionDefinition<Input> = {
  key: "document-list",
  type: "search",
  resource: "document",
  title: "List Documents",
  description: "List the documents a mailbox has received.",
  params: [
    mailboxIdParam,
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 25,
      validation: { integer: true, min: 1 },
    },
    { key: "search", label: "Search", type: "string" },
    { key: "ordering", label: "Order by", type: "select", options: orderingOptions },
    { key: "status", label: "Status", type: "select", options: documentStatusOptions },
    {
      key: "receivedAfter",
      label: "Received after",
      type: "date",
      hint: "yyyy-mm-dd",
    },
    {
      key: "receivedBefore",
      label: "Received before",
      type: "date",
      hint: "yyyy-mm-dd",
    },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      placeholder: "Asia/Singapore",
      hint: "For the received-date filters above. Defaults to UTC.",
    },
    {
      key: "withResult",
      label: "Include parsed result",
      type: "boolean",
      hint: "Adds each document's parsed result string inline, avoiding a Get Document call per " +
        "document.",
    },
  ],
  output: [
    { key: "count", type: "number", label: "Documents on this page" },
    { key: "current", type: "number", label: "Current page" },
    { key: "total", type: "number", label: "Total pages" },
    { key: "results", type: "array", label: "Documents" },
  ],

  execute(input, ctx) {
    return new ParseurClient(ctx).request<ParseurListPage<unknown>>(
      `/parser/${encodeId(input.mailboxId)}/document_set`,
      {
        query: {
          ...paginationQuery(input),
          status: input.status,
          received_after: input.receivedAfter,
          received_before: input.receivedBefore,
          tz: input.timezone,
          with_result: input.withResult ? "true" : undefined,
        },
      },
    );
  },
};

export default documentList;
