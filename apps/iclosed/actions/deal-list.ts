import type { ActionDefinition } from "@w6w/types";
import { IClosedClient } from "../lib/client.ts";

/**
 * `GET /v1/deals` — List deals with filters and page-based pagination.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  contactId?: number;
  userIds?: string;
  productIds?: string;
  transactionType?: string;
  contactStatuses?: string;
  eventIds?: string;
  search?: string;
  limit?: number;
  page?: number;
  orderBy?: string;
  orderColumn?: string;
  timeFrom?: string;
  timeTo?: string;
}

const dealList: ActionDefinition<Input> = {
  key: "deal-list",
  type: "read",
  resource: "deal",
  title: "List deals",
  description: "List deals with filters and page-based pagination.",
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "number",
      validation: { integer: true },
    },
    {
      key: "userIds",
      label: "User IDs",
      type: "string",
      hint: "Comma-separated assignee IDs.",
    },
    {
      key: "productIds",
      label: "Product IDs",
      type: "string",
      hint: "Comma-separated.",
    },
    {
      key: "transactionType",
      label: "Transaction type",
      type: "select",
      options: [{ value: "WON", label: "Won" }, { value: "RECURRING", label: "Recurring" }, {
        value: "DEPOSIT",
        label: "Deposit",
      }],
    },
    {
      key: "contactStatuses",
      label: "Contact statuses",
      type: "string",
      hint: "Comma-separated.",
    },
    {
      key: "eventIds",
      label: "Event IDs",
      type: "string",
      hint: "Comma-separated.",
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Matches provider, product name and contact fields.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true },
      hint: "Records per page (maximum 200). Vendor default 20.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true },
      hint: "Zero-based page index. Default 0.",
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
        { value: "time", label: "time" },
        { value: "value", label: "value" },
        { value: "firstName", label: "firstName" },
        { value: "lastName", label: "lastName" },
        { value: "email", label: "email" },
        { value: "phoneNumber", label: "phoneNumber" },
      ],
    },
    {
      key: "timeFrom",
      label: "Time from",
      type: "string",
      hint: "ISO 8601, inclusive.",
    },
    {
      key: "timeTo",
      label: "Time to",
      type: "string",
      hint: "ISO 8601, inclusive.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "{count, deals[]}" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/deals", {
      query: {
        contactId: input.contactId,
        userIds: input.userIds,
        productIds: input.productIds,
        transactionType: input.transactionType,
        contactStatuses: input.contactStatuses,
        eventIds: input.eventIds,
        search: input.search,
        limit: input.limit,
        page: input.page,
        orderBy: input.orderBy,
        orderColumn: input.orderColumn,
        timeFrom: input.timeFrom,
        timeTo: input.timeTo,
      },
    });
  },
};

export default dealList;
