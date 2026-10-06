import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/threads/mute`
 *
 * Mute a thread for a number of minutes.
 */
interface Input {
  threadId: number;
  minutes: number;
}

const threadMute: ActionDefinition<Input> = {
  key: "thread-mute",
  type: "perform",
  resource: "thread",
  title: "Mute Thread",
  description: "Mute a thread for a number of minutes.",
  idempotent: true,
  params: [
    { key: "threadId", label: "Thread ID", type: "number", required: true },
    { key: "minutes", label: "Minutes", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Thread ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "channel_id", type: "number", label: "Channel ID" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/threads/mute",
      params: { "id": input.threadId, "minutes": input.minutes },
    });
  },
};

export default threadMute;
