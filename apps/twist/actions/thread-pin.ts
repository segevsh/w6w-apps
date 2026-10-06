import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/threads/pin`
 *
 * Pin a thread.
 */
interface Input {
  threadId: number;
}

const threadPin: ActionDefinition<Input> = {
  key: "thread-pin",
  type: "perform",
  resource: "thread",
  title: "Pin Thread",
  description: "Pin a thread.",
  idempotent: true,
  params: [
    { key: "threadId", label: "Thread ID", type: "number", required: true },
  ],
  output: [
    {
      key: "result",
      type: "string",
      label: "Twist's response when it is not an object (normally empty)",
    },
  ],

  execute(input, ctx) {
    return twist(ctx, { method: "POST", path: "/threads/pin", params: { "id": input.threadId } });
  },
};

export default threadPin;
