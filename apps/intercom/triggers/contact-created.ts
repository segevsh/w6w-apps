import { webhookTrigger } from "../lib/triggers.ts";

/** A user is created (topic `contact.user.created`). */
const contactCreated = webhookTrigger({
  key: "contact-created",
  title: "New Contact",
  description:
    "Fires when a new user contact is created in Intercom. The run gets the notification id and topic and the full contact object.",
  topic: "contact.user.created",
  sample: {
    notificationId: "notif_4b7a1e90-2d3c-4a5b-8c6d-7e8f9a0b1c2d",
    topic: "contact.user.created",
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

export default contactCreated;
