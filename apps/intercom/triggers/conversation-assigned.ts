import { webhookTrigger } from "../lib/triggers.ts";

/** Intercom topic `conversation.admin.assigned`. */
export default webhookTrigger({
  key: "conversation-assigned",
  title: "Conversation Assigned",
  description:
    "Fires when an admin assigns a conversation. The run gets the notification id and topic and the conversation object.",
  topic: "conversation.admin.assigned",
  sample: {
    notificationId: "notif_11c0ffee-1111-4222-8333-444455556666",
    topic: "conversation.admin.assigned",
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
