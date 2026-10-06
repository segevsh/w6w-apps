import type { ActionDefinition } from "@w6w/types";
import { idList, jsonValue, twist } from "../lib/client.ts";

/**
 * `POST /api/v3/comments/update`
 *
 * Edit a comment.
 */
interface Input {
  commentId: number;
  content?: string;
  directMentions?: string;
  directGroupMentions?: string;
  actions?: unknown;
  attachments?: unknown;
}

const commentUpdate: ActionDefinition<Input> = {
  key: "comment-update",
  type: "perform",
  resource: "comment",
  title: "Update Comment",
  description: "Edit a comment.",
  idempotent: true,
  params: [
    { key: "commentId", label: "Comment ID", type: "number", required: true },
    {
      key: "content",
      label: "Content",
      type: "text",
      hint:
        "Mentions: [Name](twist-mention://user_id) for a user, [Group](twist-group-mention://group_id) for a group. Max 15,000 characters.",
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
    {
      key: "actions",
      label: "Action buttons",
      type: "json",
      hint: "JSON list of action buttons: {action, type, button_text, message?, url?}.",
    },
    {
      key: "attachments",
      label: "Attachments",
      type: "json",
      hint: "JSON list in the format returned by an attachment upload.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Comment ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "thread_id", type: "number", label: "Thread ID" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/comments/update",
      params: {
        "id": input.commentId,
        "content": input.content,
        "direct_mentions": idList(input.directMentions),
        "direct_group_mentions": idList(input.directGroupMentions),
        "actions": jsonValue(input.actions),
        "attachments": jsonValue(input.attachments),
      },
    });
  },
};

export default commentUpdate;
