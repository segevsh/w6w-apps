import type { ActionDefinition } from "@w6w/types";
import { FreshdeskClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  requesterEmail?: string;
  requesterId?: number;
  companyId?: number;
  updatedSince?: string;
  orderBy?: string;
  orderType?: string;
  page?: number;
  perPage?: number;
}

const ticketGetMany: ActionDefinition<Input> = {
  key: "ticket-get-many",
  type: "search",
  resource: "ticket",
  title: "List Tickets",
  description: "List tickets, newest first by default. Use the filters to narrow the set.",
  params: [
    { key: "requesterEmail", label: "Requester email", type: "string", row: "filter" },
    { key: "requesterId", label: "Requester ID", type: "number", row: "filter" },
    { key: "companyId", label: "Company ID", type: "number", row: "filter" },
    {
      key: "updatedSince",
      label: "Updated since",
      type: "datetime",
      hint: "Only tickets updated on or after this time.",
    },
    {
      key: "orderBy",
      label: "Sort by",
      type: "select",
      default: "created_at",
      row: "sort",
      options: [
        { value: "created_at", label: "Created" },
        { value: "due_by", label: "Due by" },
        { value: "updated_at", label: "Updated" },
        { value: "status", label: "Status" },
      ],
    },
    {
      key: "orderType",
      label: "Order",
      type: "select",
      default: "desc",
      row: "sort",
      options: [
        { value: "desc", label: "Descending" },
        { value: "asc", label: "Ascending" },
      ],
    },
    ...pagination,
  ],
  output: [{ key: "tickets", type: "array", label: "Tickets" }],

  async execute(input, ctx) {
    const tickets = await new FreshdeskClient(ctx).request("/tickets", {
      query: {
        email: unset(input.requesterEmail),
        requester_id: input.requesterId,
        company_id: input.companyId,
        updated_since: unset(input.updatedSince),
        order_by: unset(input.orderBy),
        order_type: unset(input.orderType),
        page: input.page,
        per_page: input.perPage,
      },
    });
    return { tickets };
  },
};

export default ticketGetMany;
