import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient, type EventbriteListResponse } from "../lib/client.ts";

interface Input {
  eventId: string;
  forSale?: boolean;
  /** Legacy saved input; ticket-class endpoints use the API's fixed page size. */
  pageSize?: number;
  continuation?: string;
}

const listTicketClasses: ActionDefinition<Input> = {
  key: "list-ticket-classes",
  type: "read",
  resource: "ticket_class",
  title: "List Ticket Classes",
  description: "List ticket classes for an event.",
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    {
      key: "forSale",
      label: "Only currently for sale",
      type: "boolean",
      default: false,
      hint: "Uses /ticket_classes/for_sale/ when true.",
    },
    { key: "continuation", label: "Continuation token", type: "string" },
  ],
  output: [
    { key: "ticket_classes", type: "array", label: "Ticket classes" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const id = encodeURIComponent(input.eventId);
    const path = input.forSale
      ? `/events/${id}/ticket_classes/for_sale/`
      : `/events/${id}/ticket_classes/`;
    return client.request<EventbriteListResponse<"ticket_classes">>(path, {
      query: {
        continuation: input.continuation,
      },
    });
  },
};

export default listTicketClasses;
