import type { ActionDefinition } from "@w6w/types";
import { idList, jsonValue, twist } from "../lib/client.ts";

/**
 * `POST /api/v3/comments/add`
 *
 * Post a comment on a thread.
 *
 * Not idempotent: a retry repeats the side effect.
 */
interface Input {
  threadId: number;
  content: string;
  recipients?: string;
  groups?: string;
  directMentions?: string;
  directGroupMentions?: string;
  actions?: unknown;
  attachments?: unknown;
  markThreadPosition?: boolean;
  sendAsIntegration?: boolean;
  tempId?: number;
}

const commentCreate: ActionDefinition<Input> = {
  key: "comment-create",
  type: "perform",
  resource: "comment",
  title: "Create Comment",
  description: "Post a comment on a thread.",
  idempotent: false,
  params: [
    { key: "threadId", label: "Thread ID", type: "number", required: true },
    {
      key: "content",
      label: "Content",
      type: "text",
      required: true,
      hint:
        "Mentions: [Name](twist-mention://user_id) for a user, [Group](twist-group-mention://group_id) for a group. Max 15,000 characters.",
    },
    {
      key: "recipients",
      label: "Recipients",
      type: "string",
      hint: "Comma-separated user ids to notify, or EVERYONE.",
    },
    {
      key: "groups",
      label: "Groups",
      type: "string",
      hint: "Comma-separated group ids to notify.",
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
    {
      key: "markThreadPosition",
      label: "Mark thread position",
      type: "boolean",
      hint: "Twist marks the position by default.",
    },
    { key: "sendAsIntegration", label: "Send as integration", type: "boolean" },
    { key: "tempId", label: "Temporary ID", type: "number", hint: "Negative temporary id." },
  ],
  output: [
    { key: "id", type: "number", label: "Comment ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "thread_id", type: "number", label: "Thread ID" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/comments/add",
      params: {
        "thread_id": input.threadId,
        "content": input.content,
        "recipients": idList(input.recipients),
        "groups": idList(input.groups),
        "direct_mentions": idList(input.directMentions),
        "direct_group_mentions": idList(input.directGroupMentions),
        "actions": jsonValue(input.actions),
        "attachments": jsonValue(input.attachments),
        "mark_thread_position": input.markThreadPosition,
        "send_as_integration": input.sendAsIntegration,
        "temp_id": input.tempId,
      },
    });
  },
};

export default commentCreate;
