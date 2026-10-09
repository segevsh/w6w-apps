import { webhookTrigger } from "../lib/triggers.ts";

const ticketClassCreated = webhookTrigger({
  key: "ticket-class-created",
  title: "New Ticket Class",
  description: "Fires when a ticket class is added to an event. The run gets the ticket class.",
  action: "ticket_class.created",
});

export default ticketClassCreated;
