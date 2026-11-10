import { webhookTrigger } from "../lib/triggers.ts";

/** Intercom topic `conversation.admin.replied`. */
export default webhookTrigger({
  key: "conversation-admin-replied",
  title: "Conversation Replied by Admin",
  description:
    "Fires when an admin replies in a conversation. The run gets the notification id and topic and the conversation with the new part.",
  topic: "conversation.admin.replied",
  sample: {
    notificationId: "notif_09c0ffee-1111-4222-8333-444455556666",
    topic: "conversation.admin.replied",
    appId: "abc123",
    createdAt: 1762683400,
    itemId: "215470000000001",
    item: {
      type: "conversation",
      id: "215470000000001",
      created_at: 1762683299,
      state: "open",
      source: { type: "conversation", body: "<p>Hi, I need help</p>" },
    },
  },
});
