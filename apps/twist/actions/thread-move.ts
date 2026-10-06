import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/threads/move_to_channel`
 *
 * Move a thread to another channel.
 */
interface Input {
  threadId: number;
  toChannelId: number;
}

const threadMove: ActionDefinition<Input> = {
  key: "thread-move",
  type: "perform",
  resource: "thread",
  title: "Move Thread",
  description: "Move a thread to another channel.",
  idempotent: true,
  params: [
    { key: "threadId", label: "Thread ID", type: "number", required: true },
    { key: "toChannelId", label: "Target channel ID", type: "number", required: true },
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
      path: "/threads/move_to_channel",
      params: { "id": input.threadId, "to_channel": input.toChannelId },
    });
  },
};

export default threadMove;
