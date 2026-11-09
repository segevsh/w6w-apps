import { EVENT_TYPES, webhookTrigger } from "../lib/triggers.ts";

/** A Zendesk event-subscription webhook on `ticket.created`. */
export default webhookTrigger({
  key: "new-ticket",
  title: "New Ticket",
  description:
    "Fires when a ticket is created in Zendesk. The run gets the new ticket and the event that announced it.",
  eventType: EVENT_TYPES.created,
  sample: {
    eventId: "cbe4028c-7239-495d-b020-f22348516046",
    type: EVENT_TYPES.created,
    time: "2025-01-08T10:12:07.672717030Z",
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
      tags: ["urgent"],
      created_at: "2025-01-08T10:12:07Z",
    },
    event: {},
  },
});
