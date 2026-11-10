import { webhookTrigger } from "../lib/triggers.ts";

/** Intercom topic `conversation.deleted`. */
export default webhookTrigger({
  key: "conversation-deleted",
  title: "Conversation Deleted",
  description:
    "Fires when a conversation is deleted. The run gets the notification id and topic and the conversation object as it was.",
  topic: "conversation.deleted",
  sample: {
    notificationId: "notif_12c0ffee-1111-4222-8333-444455556666",
    topic: "conversation.deleted",
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
