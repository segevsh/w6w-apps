import type { ActionDefinition } from "@w6w/types";
import { idList, jsonValue, twist } from "../lib/client.ts";

/**
 * `POST /api/v3/threads/update`
 *
 * Edit a thread's title or content.
 */
interface Input {
  threadId: number;
  title?: string;
  content?: string;
  directMentions?: string;
  directGroupMentions?: string;
  actions?: unknown;
  attachments?: unknown;
}

const threadUpdate: ActionDefinition<Input> = {
  key: "thread-update",
  type: "perform",
  resource: "thread",
  title: "Update Thread",
  description: "Edit a thread's title or content.",
  idempotent: true,
  params: [
    { key: "threadId", label: "Thread ID", type: "number", required: true },
    { key: "title", label: "Title", type: "string", hint: "1 to 300 characters." },
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
    { key: "id", type: "number", label: "Thread ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "channel_id", type: "number", label: "Channel ID" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/threads/update",
      params: {
        "id": input.threadId,
        "title": input.title,
        "content": input.content,
        "direct_mentions": idList(input.directMentions),
        "direct_group_mentions": idList(input.directGroupMentions),
        "actions": jsonValue(input.actions),
        "attachments": jsonValue(input.attachments),
      },
    });
  },
};

export default threadUpdate;
