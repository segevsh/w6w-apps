import { webhookTrigger } from "../lib/triggers.ts";

/** Intercom topics `contact.user.updated` / `contact.lead.updated`. */
export default webhookTrigger({
  key: "contact-updated",
  title: "Contact Updated",
  description:
    "Fires when a user or lead contact is updated in Intercom. The run gets the notification id and topic and the updated contact object.",
  topic: ["contact.user.updated", "contact.lead.updated"],
  sample: {
    notificationId: "notif_02c0ffee-1111-4222-8333-444455556666",
    topic: "contact.user.updated",
    appId: "abc123",
    createdAt: 1762683400,
    itemId: "6543210fedcba9876543210f",
    item: {
      type: "contact",
      id: "6543210fedcba9876543210f",
      role: "user",
      email: "ada@example.com",
      name: "Ada Lovelace",
    },
  },
});
