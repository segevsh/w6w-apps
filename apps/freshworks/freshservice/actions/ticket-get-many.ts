import type { ActionDefinition } from "@w6w/types";
import { FreshserviceClient, unset } from "../lib/client.ts";
import { orderTypeParam, pagination, workspaceId } from "../lib/params.ts";

interface Input {
  filter?: string;
  requesterEmail?: string;
  requesterId?: number;
  type?: string;
  updatedSince?: string;
  orderType?: string;
  workspaceId?: number;
  page?: number;
  perPage?: number;
}

const ticketGetMany: ActionDefinition<Input> = {
  key: "ticket-get-many",
  type: "search",
  resource: "ticket",
  title: "List Tickets",
  description:
    "List tickets, newest first by default. Only tickets created in the past 30 days are returned unless `Updated since` is set.",
  params: [
    {
      key: "filter",
      label: "Predefined filter",
      type: "select",
      hint: "Freshservice's own saved filters. Leave unset for the default view.",
      options: [
        { value: "new_and_my_open", label: "New and my open" },
        { value: "watching", label: "Watching" },
        { value: "spam", label: "Spam" },
        { value: "deleted", label: "Deleted" },
      ],
    },
    { key: "requesterEmail", label: "Requester email", type: "string", row: "requester" },
    { key: "requesterId", label: "Requester ID", type: "number", row: "requester" },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "Incident", label: "Incident" },
        { value: "Service Request", label: "Service Request" },
      ],
    },
    {
      key: "updatedSince",
      label: "Updated since",
      type: "datetime",
      hint: "Required to reach tickets older than 30 days.",
    },
    orderTypeParam,
    workspaceId,
    ...pagination,
  ],
  output: [{ key: "tickets", type: "array", label: "Tickets" }],

  async execute(input, ctx) {
    const tickets = await new FreshserviceClient(ctx).resource<unknown[]>("tickets", "/tickets", {
      query: {
        filter: unset(input.filter),
        email: unset(input.requesterEmail),
        requester_id: input.requesterId,
        type: unset(input.type),
        updated_since: unset(input.updatedSince),
        order_type: unset(input.orderType),
        workspace_id: input.workspaceId,
        page: input.page,
        per_page: input.perPage,
      },
    });
    return { tickets };
  },
};

export default ticketGetMany;
