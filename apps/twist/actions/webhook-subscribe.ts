import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/hooks/subscribe`
 *
 * Register a URL that Twist calls whenever the chosen event happens. A 403 means the token's scope does not cover the event.
 *
 * Not idempotent: a retry repeats the side effect.
 */
interface Input {
  targetUrl: string;
  event: string;
  workspaceId?: number;
  channelId?: number;
  threadId?: number;
  conversationId?: number;
}

const webhookSubscribe: ActionDefinition<Input> = {
  key: "webhook-subscribe",
  type: "perform",
  resource: "webhook",
  title: "Subscribe to Event",
  description:
    "Register a URL that Twist calls whenever the chosen event happens. A 403 means the token's scope does not cover the event.",
  idempotent: false,
  params: [
    { key: "targetUrl", label: "Target URL", type: "string", required: true },
    {
      key: "event",
      label: "Event",
      type: "select",
      required: true,
      options: [
        { value: "workspace_added", label: "workspace_added" },
        { value: "workspace_updated", label: "workspace_updated" },
        { value: "workspace_deleted", label: "workspace_deleted" },
        { value: "workspace_user_added", label: "workspace_user_added" },
        { value: "workspace_user_updated", label: "workspace_user_updated" },
        { value: "workspace_user_removed", label: "workspace_user_removed" },
        { value: "channel_added", label: "channel_added" },
        { value: "channel_updated", label: "channel_updated" },
        { value: "channel_deleted", label: "channel_deleted" },
        { value: "channel_user_added", label: "channel_user_added" },
        { value: "channel_user_removed", label: "channel_user_removed" },
        { value: "thread_added", label: "thread_added" },
        { value: "thread_updated", label: "thread_updated" },
        { value: "thread_deleted", label: "thread_deleted" },
        { value: "comment_added", label: "comment_added" },
        { value: "comment_updated", label: "comment_updated" },
        { value: "comment_deleted", label: "comment_deleted" },
        { value: "message_added", label: "message_added" },
        { value: "message_updated", label: "message_updated" },
        { value: "message_deleted", label: "message_deleted" },
        { value: "group_added", label: "group_added" },
        { value: "group_updated", label: "group_updated" },
        { value: "group_deleted", label: "group_deleted" },
        { value: "group_user_added", label: "group_user_added" },
        { value: "group_user_removed", label: "group_user_removed" },
      ],
    },
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "number",
      hint: "Only fire for this workspace.",
    },
    { key: "channelId", label: "Channel ID", type: "number", hint: "Only fire for this channel." },
    { key: "threadId", label: "Thread ID", type: "number", hint: "Only fire for this thread." },
    {
      key: "conversationId",
      label: "Conversation ID",
      type: "number",
      hint: "Only fire for this conversation.",
    },
  ],
  output: [
    {
      key: "result",
      type: "string",
      label: "Twist's response when it is not an object (normally empty)",
    },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/hooks/subscribe",
      params: {
        "target_url": input.targetUrl,
        "event": input.event,
        "workspace_id": input.workspaceId,
        "channel_id": input.channelId,
        "thread_id": input.threadId,
        "conversation_id": input.conversationId,
      },
    });
  },
};

export default webhookSubscribe;
