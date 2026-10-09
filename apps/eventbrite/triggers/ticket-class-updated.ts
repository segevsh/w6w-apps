import { webhookTrigger } from "../lib/triggers.ts";

const ticketClassUpdated = webhookTrigger({
  key: "ticket-class-updated",
  title: "Ticket Class Updated",
  description: "Fires when a ticket class changes. The run gets the ticket class as it is now.",
  action: "ticket_class.updated",
});

export default ticketClassUpdated;
