import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/threads/unpin`
 *
 * Unpin a thread.
 */
interface Input {
  threadId: number;
}

const threadUnpin: ActionDefinition<Input> = {
  key: "thread-unpin",
  type: "perform",
  resource: "thread",
  title: "Unpin Thread",
  description: "Unpin a thread.",
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
    return twist(ctx, { method: "POST", path: "/threads/unpin", params: { "id": input.threadId } });
  },
};

export default threadUnpin;
