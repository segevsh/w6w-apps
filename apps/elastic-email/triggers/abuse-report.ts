import { webhookTrigger } from "../lib/triggers.ts";

/** A recipient files an abuse report (a spam complaint). */
const abuseReport = webhookTrigger({
  key: "abuse-report",
  title: "Abuse Report",
  description:
    "Fires when a recipient reports an email as spam or another complaint is recorded. The run gets the transaction id, recipient, subject, channel and time.",
  flag: "NotificationForAbuseReport",
  status: "AbuseReport",
  sample: {
    status: "AbuseReport",
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

export default abuseReport;
