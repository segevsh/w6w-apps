import { hubspotWebhookTrigger } from "../lib/triggers.ts";

/** Any HubSpot webhook notification the app is subscribed to, optionally narrowed by event type. */
export default hubspotWebhookTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on any HubSpot webhook notification the app is subscribed to (merges, restores, association changes, conversations, products, line items and more), optionally narrowed to some event types. The run gets the event type, the object id and the raw notification.",
  sampleEvent: {
    objectId: 1246978,
    changeSource: "IMPORT",
    eventId: 3816279480,
    subscriptionId: 22,
    portalId: 33,
    appId: 1160452,
    occurredAt: 1462216307945,
    eventType: "contact.creation",
    attemptNumber: 0,
  },
});
