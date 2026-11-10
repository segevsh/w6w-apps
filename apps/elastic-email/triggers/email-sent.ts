import { webhookTrigger } from "../lib/triggers.ts";

/** A message is accepted by the recipient's mail server. */
const emailSent = webhookTrigger({
  key: "email-sent",
  title: "Email Sent",
  description:
    "Fires when Elastic Email reports an email as sent, meaning the recipient's server accepted it. The run gets the transaction id, recipient, sender, subject, channel and time.",
  flag: "NotificationForSent",
  status: "Sent",
  sample: {
    status: "Sent",
    transaction: "d4f5a1b2-3c4d-4e5f-8a6b-7c8d9e0f1a2b",
    to: "jane@example.com",
    from: "news@yourbrand.com",
    date: "11/10/2026 9:30:00 AM",
    subject: "Our November news",
    channel: "November newsletter",
    account: "you@yourbrand.com",
    category: null,
    target: null,
    ip: null,
    country: null,
    state: null,
    city: null,
    userAgent: null,
    messageId: "Xy2a-sample-message-id",
    webhookId: "8a0f3a52-4b8e-4c8e-9a53-1f7c2a3b4c5d",
  },
});

export default emailSent;
