import { webhookTrigger } from "../lib/triggers.ts";

/** A user or lead starts a conversation (topic `conversation.user.created`). */
const conversationCreated = webhookTrigger({
  key: "conversation-created",
  title: "New Conversation",
  description:
    "Fires when a user or lead starts a new Intercom conversation. The run gets the notification id and topic and the full conversation object.",
  topic: "conversation.user.created",
  sample: {
    notificationId: "notif_8d1c0b52-0c5e-4f0e-9f7e-3a1d2b4c5d6e",
    topic: "conversation.user.created",
    appId: "abc123",
    createdAt: 1762683300,
    itemId: "215470000000001",
    item: {
      type: "conversation",
      id: "215470000000001",
      created_at: 1762683299,
      source: { type: "conversation", body: "<p>Hi, I need help</p>" },
    },
  },
});

export default conversationCreated;
