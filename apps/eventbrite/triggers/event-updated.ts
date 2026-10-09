import { webhookTrigger } from "../lib/triggers.ts";

const eventUpdated = webhookTrigger({
  key: "event-updated",
  title: "Event Updated",
  description: "Fires when an event's details change. The run gets the event as it is now.",
  action: "event.updated",
});

export default eventUpdated;
