import { writeAction } from "../lib/factory.ts";

/**
 * `POST /Tickets/{ticketID}/Notes` — add a note to a ticket.
 *
 * The vendor's TicketNotes page marks `description`, `noteType`, `publish` and `ticketID`
 * required. `noteType` and `publish` are picklists (`publish` decides who can see the note), so
 * read their ids with `entity-fields` (`TicketNotes`). The note TITLE is required only when the
 * ticket category's "Require titles on ticket notes" setting is on, and the API enforces it.
 */
export default writeAction({
  key: "ticket-note-create",
  title: "Add ticket note",
  description:
    "Add a note to a ticket. `noteType` and `publish` (who can see it) are picklist ids from " +
    "`entity-fields`; a title is required only if the ticket category demands one.",
  resource: "ticket-note",
  method: "POST",
  path: (ticketId) => `/Tickets/${ticketId}/Notes`,
  parent: { key: "ticketID", label: "Ticket ID", type: "number" },
  fields: [
    { key: "description", label: "Note", type: "text", required: true },
    { key: "noteType", label: "Note type (picklist id)", type: "number", required: true },
    { key: "publish", label: "Publish to (picklist id)", type: "number", required: true },
    { key: "title", label: "Title", type: "string" },
  ],
});
