import { brevoWebhook } from "../lib/triggers.ts";

export default brevoWebhook({
  key: "email-delivered",
  title: "Email Delivered",
  description: "Fires when a transactional email is delivered. The run gets the delivery event.",
  type: "transactional",
  events: ["delivered"],
  output: [
    { key: "event", type: "string", label: "Event" },
    { key: "email", type: "string", label: "Recipient email" },
    { key: "message-id", type: "string", label: "Message ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "tag", type: "string", label: "Tag" },
    { key: "date", type: "string", label: "Event date" },
    { key: "ts_event", type: "number", label: "Event timestamp (UTC seconds)" },
  ],
  sample: {
    id: 25290,
    event: "delivered",
    email: "ada@example.com",
    "message-id": "<202611100900.1@smtp-relay.example>",
    subject: "Welcome to Acme",
    tag: "welcome",
    date: "2026-11-10 10:00:00",
    ts_event: 1794218400,
  },
});
