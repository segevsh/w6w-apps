import { webhookTrigger } from "../lib/triggers.ts";

/** Intercom topic `contact.deleted`. */
export default webhookTrigger({
  key: "contact-deleted",
  title: "Contact Deleted",
  description:
    "Fires when a contact is deleted in Intercom. The run gets the notification id and topic and the contact object as it was.",
  topic: "contact.deleted",
  sample: {
    notificationId: "notif_03c0ffee-1111-4222-8333-444455556666",
    topic: "contact.deleted",
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
