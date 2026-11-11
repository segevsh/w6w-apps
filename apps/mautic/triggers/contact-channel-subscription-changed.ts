import { webhookTrigger } from "../lib/triggers.ts";

/** A Mautic webhook on `mautic.lead_channel_subscription_changed`. */
export default webhookTrigger({
  key: "contact-channel-subscription-changed",
  title: "Contact Channel Subscription Changed",
  description:
    "Fires when a contact's subscription status for a channel (email, sms) changes. The run gets the contact, the channel and the old and new status.",
  event: "mautic.lead_channel_subscription_changed",
  idOf: (p) => (p.contact as { id?: unknown } | undefined)?.id,
  sample: {
    "event": "mautic.lead_channel_subscription_changed",
    "timestamp": "2026-11-10T09:30:01+00:00",
    "resourceId": "42",
    "resource": {
      "contact": {
        "id": 42,
        "points": 0,
        "fields": {
          "core": {
            "firstname": { "value": "Jackie" },
            "email": { "value": "jackie@example.com" },
          },
        },
        "tags": [],
      },
      "channel": "email",
      "old_status": "contactable",
      "new_status": "unsubscribed",
      "timestamp": "2026-11-10T09:30:01+00:00",
    },
  },
});
