import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/threads/star`
 *
 * Star a thread.
 */
interface Input {
  threadId: number;
}

const threadStar: ActionDefinition<Input> = {
  key: "thread-star",
  type: "perform",
  resource: "thread",
  title: "Star Thread",
  description: "Star a thread.",
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
    return twist(ctx, { method: "POST", path: "/threads/star", params: { "id": input.threadId } });
  },
};

export default threadStar;
