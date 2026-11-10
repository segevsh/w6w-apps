import { webhookTrigger } from "../lib/triggers.ts";

/** Intercom topics `conversation.user.created` / `conversation.admin.single.created`. */
export default webhookTrigger({
  key: "new-conversation",
  title: "New Conversation (Any Starter)",
  description:
    "Fires when a conversation is started by a user, a lead or an admin (a 1:1 message). The run gets the notification id and topic and the full conversation object.",
  topic: ["conversation.user.created", "conversation.admin.single.created"],
  sample: {
    notificationId: "notif_07c0ffee-1111-4222-8333-444455556666",
    topic: "conversation.admin.single.created",
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
