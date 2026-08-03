import type { ActionDefinition } from "@w6w/types";
import {
  dateRange,
  JobberClient,
  optionalInput,
  PAGE_INFO,
  REQUEST_FIELDS,
  sortInput,
} from "../lib/client.ts";

interface Input {
  clientId?: string;
  propertyId?: string;
  status?: string;
  assignedTo?: string;
  searchTerm?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  sortKey?: string;
  sortDirection?: string;
  first?: number;
  after?: string;
}

/**
 * The `sort` argument is a **list** here (`[RequestsSortInput!]`) where the
 * clients query takes a single object. That asymmetry is a real breaking change
 * Jobber shipped in API version 2024-11-12 — "Type for argument sort on field
 * requests changed from RequestsSortInput to [RequestsSortInput!]" — and it is
 * why this app pins a version rather than floating one.
 */
const QUERY = `
  query ListRequests(
    $filter: RequestFilterAttributes
    $searchTerm: String
    $sort: [RequestsSortInput!]
    $first: Int
    $after: String
  ) {
    requests(filter: $filter, searchTerm: $searchTerm, sort: $sort, first: $first, after: $after) {
      nodes { ${REQUEST_FIELDS} }
      ${PAGE_INFO}
    }
  }
`;

const requestList: ActionDefinition<Input> = {
  key: "request-list",
  type: "search",
  resource: "request",
  title: "List Requests",
  description:
    "List work requests — the inbound form submissions that precede a quote. Filter by client, property, status or assignee.",
  params: [
    { key: "clientId", label: "Client ID", type: "string" },
    { key: "propertyId", label: "Property ID", type: "string", advanced: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "new", label: "New" },
        { value: "today", label: "Today" },
        { value: "upcoming", label: "Upcoming" },
        { value: "overdue", label: "Overdue" },
        { value: "unscheduled", label: "Unscheduled" },
        { value: "assessment_completed", label: "Assessment completed" },
        { value: "completed", label: "Completed" },
        { value: "converted", label: "Converted" },
        { value: "archived", label: "Archived" },
      ],
      hint: "Jobber's request statuses are lower-case; they are not the same vocabulary as jobs.",
    },
    {
      key: "assignedTo",
      label: "Assigned user ID",
      type: "string",
      hint: "Matches the user assigned to the request's assessment.",
      advanced: true,
    },
    { key: "searchTerm", label: "Search", type: "string" },
    { key: "updatedAfter", label: "Updated after", type: "datetime", advanced: true, row: "upd" },
    { key: "updatedBefore", label: "Updated before", type: "datetime", advanced: true, row: "upd" },
    {
      key: "sortKey",
      label: "Sort by",
      type: "select",
      options: [
        { value: "REQUESTED_AT", label: "Requested at" },
        { value: "STATUS", label: "Status" },
        { value: "STATUS_AND_REQUESTED_AT", label: "Status, then requested at" },
        { value: "TITLE", label: "Title" },
        { value: "PRIMARY_NAME", label: "Client primary name" },
        { value: "FIRST_NAME", label: "Client first name" },
        { value: "LAST_NAME", label: "Client last name" },
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
  output: [{ key: "requests", type: "object", label: "Page of requests with pageInfo" }],

  execute(input, ctx) {
    const sort = sortInput(input.sortKey, input.sortDirection);
    return new JobberClient(ctx).query(QUERY, {
      filter: optionalInput({
        clientId: input.clientId,
        propertyId: input.propertyId,
        status: input.status,
        assignedTo: input.assignedTo,
        updatedAt: dateRange(input.updatedAfter, input.updatedBefore),
      }),
      searchTerm: input.searchTerm,
      sort: sort ? [sort] : undefined,
      first: input.first ?? 25,
      after: input.after,
    });
  },
};

export default requestList;
