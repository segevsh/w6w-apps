import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/reactions/get`
 *
 * Get the reactions on a thread, comment or conversation message. Twist documents this as a POST.
 */
interface Input {
  threadId?: number;
  commentId?: number;
  messageId?: number;
}

const reactionGet: ActionDefinition<Input> = {
  key: "reaction-get",
  type: "read",
  resource: "reaction",
  title: "Get Reactions",
  description:
    "Get the reactions on a thread, comment or conversation message. Twist documents this as a POST.",
  params: [
    {
      key: "threadId",
      label: "Thread ID",
      type: "number",
      hint: "Exactly one of thread, comment or message id.",
    },
    {
      key: "commentId",
      label: "Comment ID",
      type: "number",
      hint: "Exactly one of thread, comment or message id.",
    },
    {
      key: "messageId",
      label: "Message ID",
      type: "number",
      hint: "Exactly one of thread, comment or message id.",
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
      path: "/reactions/get",
      params: {
        "thread_id": input.threadId,
        "comment_id": input.commentId,
        "message_id": input.messageId,
      },
    });
  },
};

export default reactionGet;
