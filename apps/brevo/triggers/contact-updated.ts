import { brevoWebhook } from "../lib/triggers.ts";

export default brevoWebhook({
  key: "contact-updated",
  title: "Contact Updated",
  description:
    "Fires when a Brevo contact is updated. The run gets the contact event (email, changed attributes in content).",
  type: "marketing",
  events: ["contactUpdated"],
  output: [
    { key: "event", type: "string", label: "Event" },
    { key: "email", type: "string", label: "Email" },
    { key: "content", type: "array", label: "Changed attributes" },
    { key: "date", type: "string", label: "Event date" },
    { key: "ts", type: "number", label: "Event timestamp" },
  ],
  sample: {
    id: 1,
    event: "contact_updated",
    email: "ada@example.com",
    content: [{ name: "Ada", lastname: "Lovelace" }],
    date: "2026-11-10 10:00:00",
    ts: 1794218400,
  },
});
