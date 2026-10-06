import type { ActionDefinition } from "@w6w/types";
import { idList, jsonValue, twist } from "../lib/client.ts";

/**
 * `POST /api/v3/conversation_messages/add`
 *
 * Send a message in a conversation.
 *
 * Not idempotent: a retry repeats the side effect.
 */
interface Input {
  conversationId: number;
  content: string;
  attachments?: unknown;
  actions?: unknown;
  directMentions?: string;
  directGroupMentions?: string;
}

const messageCreate: ActionDefinition<Input> = {
  key: "message-create",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description: "Send a message in a conversation.",
  idempotent: false,
  params: [
    { key: "conversationId", label: "Conversation ID", type: "number", required: true },
    {
      key: "content",
      label: "Content",
      type: "text",
      required: true,
      hint:
        "Mentions: [Name](twist-mention://user_id) for a user, [Group](twist-group-mention://group_id) for a group. Max 15,000 characters.",
    },
    {
      key: "attachments",
      label: "Attachments",
      type: "json",
      hint: "JSON list in the format returned by an attachment upload.",
    },
    {
      key: "actions",
      label: "Action buttons",
      type: "json",
      hint: "JSON list of action buttons: {action, type, button_text, message?, url?}.",
    },
    {
      key: "directMentions",
      label: "Directly mentioned users",
      type: "string",
      hint: "Comma-separated user ids.",
    },
    {
      key: "directGroupMentions",
      label: "Directly mentioned groups",
      type: "string",
      hint: "Comma-separated group ids.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Message ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "conversation_id", type: "number", label: "Conversation ID" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/conversation_messages/add",
      params: {
        "conversation_id": input.conversationId,
        "content": input.content,
        "attachments": jsonValue(input.attachments),
        "actions": jsonValue(input.actions),
        "direct_mentions": idList(input.directMentions),
        "direct_group_mentions": idList(input.directGroupMentions),
      },
    });
  },
};

export default messageCreate;
