import { DELETED_OUTPUT, webhookTrigger } from "../lib/triggers.ts";

/** Intercom topic `conversation.deleted`. */
export default webhookTrigger({
  key: "conversation-deleted",
  title: "Conversation Deleted",
  description:
    "Fires when a conversation is deleted. The run gets the notification id and topic and the conversation's type and id (Intercom sends only identifying fields for a deletion, not the full conversation).",
  topic: "conversation.deleted",
  output: DELETED_OUTPUT,
  sample: {
    notificationId: "notif_12c0ffee-1111-4222-8333-444455556666",
    topic: "conversation.deleted",
    appId: "abc123",
    createdAt: 1762683400,
    itemId: "215470000000001",
    item: { type: "conversation", id: "215470000000001" },
  },
});
