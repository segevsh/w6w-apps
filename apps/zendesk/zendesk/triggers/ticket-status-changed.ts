import { EVENT_TYPES, webhookTrigger } from "../lib/triggers.ts";

/** A Zendesk event-subscription webhook on `ticket.status_changed`. */
export default webhookTrigger({
  key: "ticket-status-changed",
  title: "Ticket Status Changed",
  description:
    "Fires when a ticket's status changes. The run gets the ticket and the previous and current status in the event.",
  eventType: EVENT_TYPES.statusChanged,
  sample: {
    eventId: "ca74d97a-ae8c-40e9-b8a8-37e3ae0afedf",
    type: EVENT_TYPES.statusChanged,
    time: "2025-01-10T17:27:48.105316520Z",
    accountId: "18763612",
    ticketId: "1244",
    subject: "zen:ticket:1244",
    detail: { id: "1244", subject: "Printer on fire", status: "OPEN", priority: "LOW" },
    event: { previous: "NEW", current: "OPEN" },
  },
});
