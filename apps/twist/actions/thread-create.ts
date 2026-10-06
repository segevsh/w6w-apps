import type { ActionDefinition } from "@w6w/types";
import { idList, jsonValue, twist } from "../lib/client.ts";

/**
 * `POST /api/v3/threads/add`
 *
 * Post a new thread in a channel.
 *
 * Not idempotent: a retry repeats the side effect.
 */
interface Input {
  channelId: number;
  title: string;
  content: string;
  recipients?: string;
  groups?: string;
  directMentions?: string;
  directGroupMentions?: string;
  actions?: unknown;
  attachments?: unknown;
  sendAsIntegration?: boolean;
  tempId?: number;
}

const threadCreate: ActionDefinition<Input> = {
  key: "thread-create",
  type: "perform",
  resource: "thread",
  title: "Create Thread",
  description: "Post a new thread in a channel.",
  idempotent: false,
  params: [
    { key: "channelId", label: "Channel ID", type: "number", required: true },
    { key: "title", label: "Title", type: "string", required: true, hint: "1 to 300 characters." },
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
      key: "sendAsIntegration",
      label: "Send as integration",
      type: "boolean",
      hint: "Show the integration as the creator.",
    },
    { key: "tempId", label: "Temporary ID", type: "number", hint: "Negative temporary id." },
  ],
  output: [
    { key: "id", type: "number", label: "Thread ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "channel_id", type: "number", label: "Channel ID" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/threads/add",
      params: {
        "channel_id": input.channelId,
        "title": input.title,
        "content": input.content,
        "recipients": idList(input.recipients),
        "groups": idList(input.groups),
        "direct_mentions": idList(input.directMentions),
        "direct_group_mentions": idList(input.directGroupMentions),
        "actions": jsonValue(input.actions),
        "attachments": jsonValue(input.attachments),
        "send_as_integration": input.sendAsIntegration,
        "temp_id": input.tempId,
      },
    });
  },
};

export default threadCreate;
