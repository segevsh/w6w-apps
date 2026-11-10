import { webhookTrigger } from "../lib/triggers.ts";

/** A PostHog "HTTP Webhook" destination filtered to `$identify`. */
const personIdentified = webhookTrigger({
  key: "person-identified",
  title: "Person Identified",
  description:
    "Fires when a visitor is identified as a known person ($identify), as forwarded by a PostHog webhook destination. Filter the destination to this event; other events it sends are ignored. The run gets the event name, UUID, distinct id, timestamp and properties, the person, and the full request body.",
  events: ["$identify"],
  sample: {
    eventName: "$identify",
    properties: { $set: { email: "ada@example.com" } },
    data: {
      event: { event: "$identify", distinct_id: "user-123" },
      person: { id: "0192b2ae-0000-7000-8000-000000000002" },
    },
  },
});

export default personIdentified;
