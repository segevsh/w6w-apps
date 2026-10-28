import type { ActionDefinition } from "@w6w/types";
import { ZendeskClient } from "../lib/client.ts";

/**
 * The source of the numeric ids that `customFields` on the ticket actions
 * expects — Zendesk custom fields are addressed by id, not by title.
 */
const ticketFieldGetMany: ActionDefinition<Record<string, never>> = {
  key: "ticket-field-get-many",
  type: "search",
  resource: "ticketField",
  title: "List Ticket Fields",
  description:
    "List ticket fields with their ids — the ids the ticket actions' Custom fields param needs.",
  params: [],
  output: [{ key: "ticket_fields", type: "array", label: "Ticket fields" }],

  execute(_input, ctx) {
    return new ZendeskClient(ctx).request("/ticket_fields.json");
  },
};

export default ticketFieldGetMany;
