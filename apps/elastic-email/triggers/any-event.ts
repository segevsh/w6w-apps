import { webhookTrigger } from "../lib/triggers.ts";

/** Any Elastic Email email notification, or only the types named in the `events` param. */
const anyEvent = webhookTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires for any Elastic Email notification: sent, opened, clicked, unsubscribed, bounced or failed, and abuse report. Events picks the notification types to register for (empty = all six). The run gets the transaction id, status, recipient, sender, subject, channel, time and the type-specific fields.",
  anyEvent: true,
  sample: {
    status: "Opened",
    transaction: "d4f5a1b2-3c4d-4e5f-8a6b-7c8d9e0f1a2b",
    to: "jane@example.com",
    from: "news@yourbrand.com",
    date: "11/10/2026 9:35:00 AM",
    subject: "Our November news",
    channel: "November newsletter",
    account: "you@yourbrand.com",
    category: null,
    target: null,
    ip: "203.0.113.7",
    country: "Poland",
    state: null,
    city: null,
    userAgent: "Mozilla/5.0",
    messageId: "Xy2a-sample-message-id",
    webhookId: "8a0f3a52-4b8e-4c8e-9a53-1f7c2a3b4c5d",
  },
});

export default anyEvent;
