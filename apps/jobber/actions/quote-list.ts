import type { ActionDefinition } from "@w6w/types";
import {
  dateRange,
  JobberClient,
  optionalInput,
  PAGE_INFO,
  QUOTE_FIELDS,
  sortInput,
} from "../lib/client.ts";

interface Input {
  clientId?: string;
  status?: string;
  salespersonId?: string;
  searchTerm?: string;
  createdAfter?: string;
  createdBefore?: string;
  sortKey?: string;
  sortDirection?: string;
  first?: number;
  after?: string;
}

const QUERY = `
  query ListQuotes(
    $filter: QuoteFilterAttributes
    $searchTerm: String
    $sort: [QuotesSortInput!]
    $first: Int
    $after: String
  ) {
    quotes(filter: $filter, searchTerm: $searchTerm, sort: $sort, first: $first, after: $after) {
      nodes { ${QUOTE_FIELDS} }
      ${PAGE_INFO}
    }
  }
`;

const quoteList: ActionDefinition<Input> = {
  key: "quote-list",
  type: "search",
  resource: "quote",
  title: "List Quotes",
  description:
    "List quotes with their totals and status. Filter by client, status, salesperson or creation window.",
  params: [
    { key: "clientId", label: "Client ID", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "draft", label: "Draft" },
        { value: "awaiting_response", label: "Awaiting response" },
        { value: "changes_requested", label: "Changes requested" },
        { value: "approved", label: "Approved" },
        { value: "converted", label: "Converted to job" },
        { value: "archived", label: "Archived" },
      ],
    },
    { key: "salespersonId", label: "Salesperson user ID", type: "string", advanced: true },
    { key: "searchTerm", label: "Search", type: "string" },
    { key: "createdAfter", label: "Created after", type: "datetime", advanced: true, row: "made" },
    {
      key: "createdBefore",
      label: "Created before",
      type: "datetime",
      advanced: true,
      row: "made",
    },
    {
      key: "sortKey",
      label: "Sort by",
      type: "select",
      options: [
        { value: "CREATED_AT", label: "Created at" },
        { value: "QUOTE_NUMBER", label: "Quote number" },
        { value: "QUOTE_STATUS", label: "Status" },
        { value: "QUOTE_TOTAL", label: "Total" },
        { value: "LAST_SENT_AT", label: "Last sent at" },
        { value: "APPROVED_AT", label: "Approved at" },
        { value: "CONVERTED_AT", label: "Converted at" },
        { value: "CLIENT_PRIMARY_NAME", label: "Client primary name" },
      ],
      advanced: true,
      row: "sort",
    },
    {
      key: "sortDirection",
      label: "Direction",
      type: "select",
      default: "DESCENDING",
      options: [
        { value: "DESCENDING", label: "Descending" },
        { value: "ASCENDING", label: "Ascending" },
      ],
      advanced: true,
      row: "sort",
    },
    {
      key: "first",
      label: "Page size",
      type: "number",
      default: 25,
      validation: { min: 1, max: 100, integer: true },
    },
    { key: "after", label: "Cursor", type: "string" },
  ],
  output: [{ key: "quotes", type: "object", label: "Page of quotes with pageInfo" }],

  execute(input, ctx) {
    const sort = sortInput(input.sortKey, input.sortDirection);
    return new JobberClient(ctx).query(QUERY, {
      filter: optionalInput({
        clientId: input.clientId,
        status: input.status,
        salespersonId: input.salespersonId,
        createdAt: dateRange(input.createdAfter, input.createdBefore),
      }),
      searchTerm: input.searchTerm,
      sort: sort ? [sort] : undefined,
      first: input.first ?? 25,
      after: input.after,
    });
  },
};

export default quoteList;
