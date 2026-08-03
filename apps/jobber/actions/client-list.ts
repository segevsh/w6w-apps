import type { ActionDefinition } from "@w6w/types";
import {
  CLIENT_FIELDS,
  csv,
  dateRange,
  JobberClient,
  optionalInput,
  PAGE_INFO,
  sortInput,
} from "../lib/client.ts";

interface Input {
  searchTerm?: string;
  isCompany?: boolean;
  isLead?: boolean;
  isArchived?: boolean;
  tags?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  sortKey?: string;
  sortDirection?: string;
  first?: number;
  after?: string;
}

const QUERY = `
  query ListClients(
    $filter: ClientFilterAttributes
    $searchTerm: String
    $sort: ClientsSortInput
    $first: Int
    $after: String
  ) {
    clients(filter: $filter, searchTerm: $searchTerm, sort: $sort, first: $first, after: $after) {
      nodes { ${CLIENT_FIELDS} }
      ${PAGE_INFO}
    }
  }
`;

const clientList: ActionDefinition<Input> = {
  key: "client-list",
  type: "search",
  resource: "client",
  title: "List Clients",
  description:
    "Search and page through clients. Returns one cursor page — read `pageInfo.endCursor` and pass it back as `after` for the next.",
  params: [
    {
      key: "searchTerm",
      label: "Search",
      type: "string",
      hint: "Free-text search across client names and contact details.",
    },
    {
      key: "isCompany",
      label: "Companies only",
      type: "boolean",
      hint: "True returns only clients stored as a business; false only individuals.",
      advanced: true,
    },
    {
      key: "isLead",
      label: "Leads only",
      type: "boolean",
      hint: "A lead is a prospective client that has not been converted yet.",
      advanced: true,
    },
    {
      key: "isArchived",
      label: "Archived",
      type: "boolean",
      hint: "Omit for Jobber's default. Archived clients are excluded unless asked for.",
      advanced: true,
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Comma-separated tag labels. A client matching any of them is returned.",
      advanced: true,
    },
    {
      key: "updatedAfter",
      label: "Updated after",
      type: "datetime",
      hint: "ISO 8601. The natural incremental-sync filter.",
      advanced: true,
      row: "updated",
    },
    {
      key: "updatedBefore",
      label: "Updated before",
      type: "datetime",
      advanced: true,
      row: "updated",
    },
    {
      key: "sortKey",
      label: "Sort by",
      type: "select",
      options: [
        { value: "UPDATED_AT", label: "Updated at" },
        { value: "PRIMARY_NAME", label: "Primary name" },
        { value: "FIRST_NAME", label: "First name" },
        { value: "LAST_NAME", label: "Last name" },
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
      hint:
        "Jobber caps a connection at 100 and prices the query at page size × fields selected — a 100-row page of clients is a large slice of a 10,000-point budget.",
    },
    {
      key: "after",
      label: "Cursor",
      type: "string",
      hint: "`pageInfo.endCursor` from the previous page.",
    },
  ],
  output: [{ key: "clients", type: "object", label: "Page of clients with pageInfo" }],

  execute(input, ctx) {
    return new JobberClient(ctx).query(QUERY, {
      filter: optionalInput({
        isCompany: input.isCompany,
        isLead: input.isLead,
        isArchived: input.isArchived,
        tags: csv(input.tags),
        updatedAt: dateRange(input.updatedAfter, input.updatedBefore),
      }),
      searchTerm: input.searchTerm,
      sort: sortInput(input.sortKey, input.sortDirection),
      first: input.first ?? 25,
      after: input.after,
    });
  },
};

export default clientList;
