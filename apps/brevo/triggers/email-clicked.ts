import { brevoWebhook } from "../lib/triggers.ts";

export default brevoWebhook({
  key: "email-clicked",
  title: "Email Clicked",
  description:
    "Fires when a recipient clicks a link in a transactional email. The run gets the click event with the link.",
  type: "transactional",
  events: ["click"],
  output: [
    { key: "event", type: "string", label: "Event" },
    { key: "email", type: "string", label: "Recipient email" },
    { key: "message-id", type: "string", label: "Message ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "tag", type: "string", label: "Tag" },
    { key: "date", type: "string", label: "Event date" },
    { key: "ts_event", type: "number", label: "Event timestamp (UTC seconds)" },
    { key: "link", type: "string", label: "Clicked link" },
  ],
  sample: {
    id: 25290,
    event: "click",
    email: "ada@example.com",
    "message-id": "<202611100900.1@smtp-relay.example>",
    subject: "Welcome to Acme",
    tag: "welcome",
    date: "2026-11-10 10:00:00",
    ts_event: 1794218400,
    link: "https://example.com/offer",
  },
});
