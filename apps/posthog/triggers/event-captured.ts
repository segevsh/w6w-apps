import { webhookTrigger } from "../lib/triggers.ts";

/** A PostHog realtime "HTTP Webhook" destination forwards the events its filters match. */
const eventCaptured = webhookTrigger({
  key: "event-captured",
  title: "Event Captured",
  description:
    "Fires for each PostHog event that a webhook destination (with your filters) forwards to the callback URL. The run gets the event name, UUID, distinct id, timestamp and properties, the person, and the full request body.",
});

export default eventCaptured;
