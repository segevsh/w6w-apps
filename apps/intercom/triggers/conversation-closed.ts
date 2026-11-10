import { webhookTrigger } from "../lib/triggers.ts";

/** Intercom topic `conversation.admin.closed`. */
export default webhookTrigger({
  key: "conversation-closed",
  title: "Conversation Closed",
  description:
    "Fires when an admin closes a conversation. The run gets the notification id and topic and the conversation object.",
  topic: "conversation.admin.closed",
  sample: {
    notificationId: "notif_10c0ffee-1111-4222-8333-444455556666",
    topic: "conversation.admin.closed",
    appId: "abc123",
    createdAt: 1762683400,
    itemId: "215470000000001",
    item: {
      type: "conversation",
      id: "215470000000001",
      created_at: 1762683299,
      state: "closed",
      source: { type: "conversation", body: "<p>Hi, I need help</p>" },
    },
  },
});
