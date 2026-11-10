import { EVENT_TYPES, webhookTrigger } from "../lib/triggers.ts";

/** A Zendesk event-subscription webhook on `ticket.soft_deleted`. */
export default webhookTrigger({
  key: "ticket-deleted",
  title: "Ticket Deleted",
  description:
    "Fires when a ticket is moved to the deleted tickets view. The run gets the ticket as it was.",
  eventType: EVENT_TYPES.ticketDeleted,
  sample: {
    eventId: "ca74d97a-ae8c-40e9-b8a8-37e3ae0afedf",
    type: EVENT_TYPES.ticketDeleted,
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
    event: {},
  },
});
