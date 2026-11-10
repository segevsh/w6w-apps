import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "event-approved",
  title: "Event Approved",
  type: "event.approved",
  description: "Fires when an organizer approves a requested event. The run gets the event.",
});
