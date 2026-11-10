import { webhookTrigger } from "../lib/triggers.ts";

/** A PostHog "HTTP Webhook" destination filtered to `$feature_flag_called`. */
const featureFlagCalled = webhookTrigger({
  key: "feature-flag-called",
  title: "Feature Flag Called",
  description:
    "Fires when a feature flag is evaluated for a user ($feature_flag_called), as forwarded by a PostHog webhook destination. Filter the destination to this event; other events it sends are ignored. The run gets the event name, UUID, distinct id, timestamp and properties, the person, and the full request body.",
  events: ["$feature_flag_called"],
  sample: {
    eventName: "$feature_flag_called",
    properties: { $feature_flag: "new-checkout", $feature_flag_response: true },
    data: {
      event: { event: "$feature_flag_called", distinct_id: "user-123" },
      person: { id: "0192b2ae-0000-7000-8000-000000000002" },
    },
  },
});

export default featureFlagCalled;
