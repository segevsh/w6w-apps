import { webhookTrigger } from "../lib/triggers.ts";

/** Intercom topics `contact.user.created` / `contact.lead.created`. */
export default webhookTrigger({
  key: "new-contact",
  title: "New Contact or Lead",
  description:
    "Fires when a user or a lead contact is created in Intercom. The run gets the notification id and topic and the full contact object.",
  topic: ["contact.user.created", "contact.lead.created"],
  sample: {
    notificationId: "notif_01c0ffee-1111-4222-8333-444455556666",
    topic: "contact.lead.created",
    appId: "abc123",
    createdAt: 1762683400,
    itemId: "6543210fedcba9876543210f",
    item: {
      type: "contact",
      id: "6543210fedcba9876543210f",
      role: "lead",
      email: "ada@example.com",
      name: "Ada Lovelace",
    },
  },
});
