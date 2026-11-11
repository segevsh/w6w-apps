import { webhookTrigger } from "../lib/triggers.ts";

/** Intercom topic `conversation.user.replied`. */
export default webhookTrigger({
  key: "conversation-user-replied",
  title: "Conversation Replied by Contact",
  description:
    "Fires when a user or lead replies in a conversation. The run gets the notification id and topic and the conversation with the new part.",
  topic: "conversation.user.replied",
  sample: {
    notificationId: "notif_08c0ffee-1111-4222-8333-444455556666",
    topic: "conversation.user.replied",
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
