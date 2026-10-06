import type { ActionDefinition } from "@w6w/types";
import { AutotaskClient } from "../lib/client.ts";

/**
 * `GET /Tickets/{ticketID}/Notes` — the notes on one ticket.
 *
 * The child collection under the ticket, rather than a `TicketNotes` query filtered on
 * `ticketID`, so a workflow reading a thread needs no filter grammar. Notes have a `publish`
 * visibility; internal notes are returned to an API user with the right security level, so a
 * workflow that forwards notes to a customer must filter on it.
 */
const action: ActionDefinition = {
  key: "ticket-note-list",
  type: "read",
  resource: "ticket-note",
  title: "List ticket notes",
  description:
    "The notes on a ticket, each with its `publish` visibility — filter on it before forwarding " +
    "notes outside the service desk.",
  params: [{ key: "ticketID", label: "Ticket ID", type: "number", required: true }],
  output: [
    { key: "notes", type: "array", label: "Ticket notes" },
    { key: "count", type: "number", label: "How many" },
  ],

  async execute(input, ctx) {
    const id = Number((input as Record<string, unknown>).ticketID);
    if (!Number.isInteger(id) || id <= 0) throw new Error("`ticketID` must be a positive integer");
    const res = await new AutotaskClient(ctx).call<{ items?: unknown[] }>(
      "GET",
      `/Tickets/${id}/Notes`,
    );
    const notes = res?.items ?? [];
    return { notes, count: notes.length };
  },
};

export default action;
