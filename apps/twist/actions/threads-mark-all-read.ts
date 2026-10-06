import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/threads/mark_all_read`
 *
 * Mark every thread in a workspace or a channel as read. Give one of the two ids.
 */
interface Input {
  workspaceId?: number;
  channelId?: number;
}

const threadsMarkAllRead: ActionDefinition<Input> = {
  key: "threads-mark-all-read",
  type: "perform",
  resource: "thread",
  title: "Mark All Threads Read",
  description: "Mark every thread in a workspace or a channel as read. Give one of the two ids.",
  idempotent: true,
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "number",
      hint: "Required unless a channel id is given.",
    },
    {
      key: "channelId",
      label: "Channel ID",
      type: "number",
      hint: "Required unless a workspace id is given.",
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
      path: "/threads/mark_all_read",
      params: { "workspace_id": input.workspaceId, "channel_id": input.channelId },
    });
  },
};

export default threadsMarkAllRead;
