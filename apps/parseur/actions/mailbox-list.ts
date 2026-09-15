import type { ActionDefinition } from "@w6w/types";
import { ParseurClient, type ParseurListPage } from "../lib/client.ts";
import { paginationParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /parser` — the mailboxes ("parsers") on this account.
 *
 * `total` in the response is the number of PAGES, not the number of
 * mailboxes overall — see `lib/client.ts`.
 */
interface Input {
  page?: number;
  pageSize?: number;
  search?: string;
  ordering?: string;
}

const orderingOptions = [
  { value: "name", label: "Name (A→Z)" },
  { value: "-name", label: "Name (Z→A)" },
  { value: "document_count", label: "Document count (low→high)" },
  { value: "-document_count", label: "Document count (high→low)" },
  { value: "template_count", label: "Template count (low→high)" },
  { value: "-template_count", label: "Template count (high→low)" },
  { value: "PARSEDOK_count", label: "Processed count (low→high)" },
  { value: "-PARSEDOK_count", label: "Processed count (high→low)" },
  { value: "PARSEDKO_count", label: "Failed count (low→high)" },
  { value: "-PARSEDKO_count", label: "Failed count (high→low)" },
  { value: "QUOTAEXC_count", label: "Quota-exceeded count (low→high)" },
  { value: "-QUOTAEXC_count", label: "Quota-exceeded count (high→low)" },
  { value: "EXPORTKO_count", label: "Export-failed count (low→high)" },
  { value: "-EXPORTKO_count", label: "Export-failed count (high→low)" },
  { value: "TRANSKO_count", label: "Post-process-failed count (low→high)" },
  { value: "-TRANSKO_count", label: "Post-process-failed count (high→low)" },
];

const mailboxList: ActionDefinition<Input> = {
  key: "mailbox-list",
  type: "search",
  resource: "mailbox",
  title: "List Mailboxes",
  description: "List the mailboxes (parsers) on this account.",
  params: paginationParams(orderingOptions),
  output: [
    { key: "count", type: "number", label: "Mailboxes on this page" },
    { key: "current", type: "number", label: "Current page" },
    { key: "total", type: "number", label: "Total pages" },
    { key: "results", type: "array", label: "Mailboxes" },
  ],

  execute(input, ctx) {
    return new ParseurClient(ctx).request<ParseurListPage<unknown>>("/parser", {
      query: paginationQuery(input),
    });
  },
};

export default mailboxList;
