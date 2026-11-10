import { brevoWebhook } from "../lib/triggers.ts";

export default brevoWebhook({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires for the Brevo webhook events you choose (transactional email, marketing, or inbound parsing; empty = every event of that type). The run gets the vendor delivery, with its event field naming what happened.",
  output: [
    { key: "event", type: "string", label: "Event" },
    { key: "email", type: "string", label: "Email" },
    { key: "id", type: "number", label: "Webhook delivery ID" },
    { key: "date", type: "string", label: "Event date" },
    { key: "ts", type: "number", label: "Event timestamp" },
  ],
  sample: {
    id: 25290,
    event: "soft_bounce",
    email: "ada@example.com",
    date: "2026-11-10 10:00:00",
    ts: 1794218400,
  },
});
