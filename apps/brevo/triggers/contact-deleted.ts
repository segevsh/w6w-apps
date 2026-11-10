import { brevoWebhook } from "../lib/triggers.ts";

export default brevoWebhook({
  key: "contact-deleted",
  title: "Contact Deleted",
  description:
    "Fires when a Brevo contact is deleted. The run gets the contact event (email, list ids).",
  type: "marketing",
  events: ["contactDeleted"],
  output: [
    { key: "event", type: "string", label: "Event" },
    { key: "email", type: "string", label: "Email" },
    { key: "list_id", type: "array", label: "List IDs" },
    { key: "date", type: "string", label: "Event date" },
    { key: "ts", type: "number", label: "Event timestamp" },
  ],
  sample: {
    id: 1,
    event: "contact_deleted",
    email: "ada@example.com",
    list_id: [35],
    date: "2026-11-10 10:00:00",
    ts: 1794218400,
  },
});
