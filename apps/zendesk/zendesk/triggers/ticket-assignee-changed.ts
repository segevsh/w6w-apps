import { EVENT_TYPES, webhookTrigger } from "../lib/triggers.ts";

/** A Zendesk event-subscription webhook on `ticket.agent_assignment_changed`. */
export default webhookTrigger({
  key: "ticket-assignee-changed",
  title: "Ticket Assignee Changed",
  description:
    "Fires when a ticket is assigned to a different agent. The run gets the ticket and the previous and current assignee ids in the event.",
  eventType: EVENT_TYPES.assigneeChanged,
  sample: {
    eventId: "1b6e7c4a-2c0e-4ec4-a1c0-6b0e1d9a3f55",
    type: EVENT_TYPES.assigneeChanged,
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
    event: { previous: "260518622", current: "7335802229630" },
  },
});
