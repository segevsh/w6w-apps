import { webhookTrigger } from "../lib/triggers.ts";

const eventCreated = webhookTrigger({
  key: "event-created",
  title: "New Event",
  description: "Fires when an event is created in the organization. The run gets the event.",
  action: "event.created",
});

export default eventCreated;
