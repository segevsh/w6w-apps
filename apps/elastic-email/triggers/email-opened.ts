import { webhookTrigger } from "../lib/triggers.ts";

/** A recipient opens an email. */
const emailOpened = webhookTrigger({
  key: "email-opened",
  title: "Email Opened",
  description:
    "Fires when a recipient opens an email. The run gets the transaction id, recipient, subject, channel, time and the recipient's IP address and country.",
  flag: "NotificationForOpened",
  status: "Opened",
  sample: {
    status: "Opened",
    transaction: "d4f5a1b2-3c4d-4e5f-8a6b-7c8d9e0f1a2b",
    to: "jane@example.com",
    from: "news@yourbrand.com",
    date: "11/10/2026 9:30:00 AM",
    subject: "Our November news",
    channel: "November newsletter",
    account: "you@yourbrand.com",
    category: null,
    target: null,
    ip: "203.0.113.7",
    country: "Poland",
    state: null,
    city: null,
    userAgent: null,
    messageId: "Xy2a-sample-message-id",
    webhookId: "8a0f3a52-4b8e-4c8e-9a53-1f7c2a3b4c5d",
  },
});

export default emailOpened;
