import type { ActionDefinition } from "@w6w/types";
import { IClosedClient } from "../lib/client.ts";

/**
 * `GET /v1/contacts` — List contacts, filterable by assignee, status, event and joined time, with page-based pagination.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  userId?: number;
  statuses?: string;
  eventIds?: string;
  search?: string;
  limit?: number;
  page?: number;
  timeFrom?: string;
  timeTo?: string;
  orderBy?: string;
  orderColumn?: string;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List contacts",
  description:
    "List contacts, filterable by assignee, status, event and joined time, with page-based pagination.",
  params: [
    {
      key: "userId",
      label: "Assigned user ID",
      type: "number",
      validation: { integer: true },
      hint: "Only contacts assigned to this user.",
    },
    {
      key: "statuses",
      label: "Statuses",
      type: "string",
      hint:
        "Comma-separated: POTENTIAL, QUALIFIED, DISQUALIFIED and the other stages your account defines.",
    },
    {
      key: "eventIds",
      label: "Event IDs",
      type: "string",
      hint: "Comma-separated positive integers, e.g. 1,2,3.",
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Case-insensitive match across first name, last name, email and phone number.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true },
      hint: "Records per page (maximum 100). Vendor default 20.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true },
      hint: "Zero-based page index. Default 0.",
    },
    {
      key: "timeFrom",
      label: "Joined from",
      type: "string",
      hint: "ISO 8601 lower bound on joinedTime.",
    },
    {
      key: "timeTo",
      label: "Joined to",
      type: "string",
      hint: "ISO 8601 upper bound on joinedTime.",
    },
    {
      key: "orderBy",
      label: "Order direction",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
      hint: "Required together with Order column.",
    },
    {
      key: "orderColumn",
      label: "Order column",
      type: "select",
      options: [
        { value: "id", label: "id" },
        { value: "createdAt", label: "createdAt" },
        { value: "updatedAt", label: "updatedAt" },
        { value: "joinedTime", label: "joinedTime" },
        { value: "firstName", label: "firstName" },
        { value: "lastName", label: "lastName" },
        { value: "email", label: "email" },
      ],
      hint: "Required together with Order direction.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "{count, contacts[]}" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/contacts", {
      query: {
        userId: input.userId,
        statuses: input.statuses,
        eventIds: input.eventIds,
        search: input.search,
        limit: input.limit,
        page: input.page,
        timeFrom: input.timeFrom,
        timeTo: input.timeTo,
        orderBy: input.orderBy,
        orderColumn: input.orderColumn,
      },
    });
  },
};

export default contactList;
