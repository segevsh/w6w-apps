import { EVENT_TYPES, webhookTrigger } from "../lib/triggers.ts";

/** A Zendesk event-subscription webhook on `ticket.comment_added`. */
export default webhookTrigger({
  key: "ticket-comment-added",
  title: "Ticket Comment Added",
  description:
    "Fires when a comment is added to a ticket. The run gets the ticket and the comment (author, body, public or private).",
  eventType: EVENT_TYPES.commentAdded,
  sample: {
    eventId: "2ba2a985-7d94-4a3f-92be-cd330679b6fa",
    type: EVENT_TYPES.commentAdded,
    time: "2025-01-15T06:13:26.962242814Z",
    accountId: "18763612",
    ticketId: "342757",
    subject: "zen:ticket:342757",
    detail: { id: "342757", subject: "Printer on fire", status: "OPEN" },
    event: {
      comment: {
        id: "8659716087550",
        author: { id: "8659716080510", is_staff: false, name: "Visitor 49333687" },
        body: "It is still on fire.",
        is_public: true,
      },
    },
  },
});
