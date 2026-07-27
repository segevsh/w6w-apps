import type { ActionDefinition } from "@w6w/types";
import { compact, IntercomClient } from "../lib/client.ts";

interface Input {
  conversationId: string;
  type: "admin" | "user";
  messageType?: "comment" | "note";
  body: string;
  adminId?: string;
  intercomUserId?: string;
  email?: string;
  userId?: string;
}

/**
 * POST /conversations/{id}/reply — reply to a conversation, either as an admin
 * or on behalf of the contact.
 *
 *   - `type: "admin"` needs `admin_id`; `message_type` may be `comment` (a
 *     visible reply) or `note` (an internal note).
 *   - `type: "user"` needs one of `intercom_user_id`, `email` or `user_id` to
 *     identify the contact, and only supports `message_type: "comment"`.
 */
const conversationReply: ActionDefinition<Input> = {
  key: "conversation-reply",
  type: "perform",
  resource: "conversation",
  title: "Reply to Conversation",
  description: "Reply to a conversation as an admin (comment or internal note) or as the contact.",
  idempotent: false,
  params: [
    { key: "conversationId", label: "Conversation ID", type: "string", required: true },
    {
      key: "type",
      label: "Reply as",
      type: "select",
      required: true,
      default: "admin",
      options: [
        { value: "admin", label: "Admin" },
        { value: "user", label: "Contact (user)" },
      ],
    },
    {
      key: "messageType",
      label: "Message type",
      type: "select",
      default: "comment",
      options: [
        { value: "comment", label: "Comment (visible reply)" },
        { value: "note", label: "Note (internal, admin only)" },
      ],
    },
    {
      key: "body",
      label: "Body",
      type: "text",
      required: true,
      hint: "The text of the reply. Notes accept some HTML.",
    },
    {
      key: "adminId",
      label: "Admin ID",
      type: "string",
      hint: "Required when replying as an admin.",
    },
    {
      key: "intercomUserId",
      label: "Intercom user ID",
      type: "string",
      advanced: true,
      hint: "Identify the contact when replying as a user.",
    },
    { key: "email", label: "Contact email", type: "string", advanced: true },
    { key: "userId", label: "Contact external user ID", type: "string", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Conversation ID" },
    { key: "conversation_parts", type: "object", label: "Conversation parts" },
  ],

  execute(input, ctx) {
    const body = compact({
      message_type: input.messageType ?? "comment",
      type: input.type,
      body: input.body,
      admin_id: input.type === "admin" ? input.adminId : undefined,
      intercom_user_id: input.type === "user" ? input.intercomUserId : undefined,
      email: input.type === "user" ? input.email : undefined,
      user_id: input.type === "user" ? input.userId : undefined,
    });
    return new IntercomClient(ctx).request(
      `/conversations/${encodeURIComponent(input.conversationId)}/reply`,
      { method: "POST", body },
    );
  },
};

export default conversationReply;
