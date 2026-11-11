import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "event-declined",
  title: "Event Declined",
  type: "event.declined",
  description: "Fires when an organizer declines a requested event. The run gets the event.",
});
