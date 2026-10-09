import { webhookTrigger } from "../lib/triggers.ts";

const ticketClassDeleted = webhookTrigger({
  key: "ticket-class-deleted",
  title: "Ticket Class Deleted",
  description:
    "Fires when a ticket class is deleted. The record is gone, so the run gets its id and no resource.",
  action: "ticket_class.deleted",
});

export default ticketClassDeleted;
