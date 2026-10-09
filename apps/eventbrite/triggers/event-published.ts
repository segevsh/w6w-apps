import { webhookTrigger } from "../lib/triggers.ts";

const eventPublished = webhookTrigger({
  key: "event-published",
  title: "Event Published",
  description: "Fires when an event is published and goes live. The run gets the event.",
  action: "event.published",
});

export default eventPublished;
