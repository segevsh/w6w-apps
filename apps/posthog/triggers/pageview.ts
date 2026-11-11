import { webhookTrigger } from "../lib/triggers.ts";

/** A PostHog "HTTP Webhook" destination filtered to `$pageview`. */
const pageview = webhookTrigger({
  key: "pageview",
  title: "Page Viewed",
  description:
    "Fires when a visitor views a page ($pageview), as forwarded by a PostHog webhook destination. Filter the destination to this event; other events it sends are ignored. The run gets the event name, UUID, distinct id, timestamp and properties, the person, and the full request body.",
  events: ["$pageview"],
  sample: {
    eventName: "$pageview",
    properties: { $current_url: "https://example.com/pricing" },
    data: {
      event: { event: "$pageview", distinct_id: "user-123" },
      person: { id: "0192b2ae-0000-7000-8000-000000000002" },
    },
  },
});

export default pageview;
