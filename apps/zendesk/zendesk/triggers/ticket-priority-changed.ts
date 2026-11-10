import { EVENT_TYPES, webhookTrigger } from "../lib/triggers.ts";

/** A Zendesk event-subscription webhook on `ticket.priority_changed`. */
export default webhookTrigger({
  key: "ticket-priority-changed",
  title: "Ticket Priority Changed",
  description:
    "Fires when a ticket's priority changes. The run gets the ticket and the previous and current priority in the event.",
  eventType: EVENT_TYPES.priorityChanged,
  sample: {
    eventId: "6d1ef9cb-83c9-4a58-b1f4-0d62c5ec3f21",
    type: EVENT_TYPES.priorityChanged,
    time: "2025-01-10T17:27:48.105316520Z",
    accountId: "18763612",
    ticketId: "5158",
    subject: "zen:ticket:5158",
    detail: {
      id: "5158",
      subject: "Printer on fire",
      status: "OPEN",
      priority: "LOW",
      requester_id: "8447388090494",
      assignee_id: "260518622",
    },
    event: { previous: "LOW", current: "URGENT" },
  },
});
