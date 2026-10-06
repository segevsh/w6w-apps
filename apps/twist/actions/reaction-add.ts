import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/reactions/add`
 *
 * React to a thread, comment or conversation message.
 */
interface Input {
  reaction: string;
  threadId?: number;
  commentId?: number;
  messageId?: number;
}

const reactionAdd: ActionDefinition<Input> = {
  key: "reaction-add",
  type: "perform",
  resource: "reaction",
  title: "Add Reaction",
  description: "React to a thread, comment or conversation message.",
  idempotent: true,
  params: [
    {
      key: "reaction",
      label: "Reaction",
      type: "string",
      required: true,
      hint: "The reaction name.",
    },
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
      path: "/reactions/add",
      params: {
        "reaction": input.reaction,
        "thread_id": input.threadId,
        "comment_id": input.commentId,
        "message_id": input.messageId,
      },
    });
  },
};

export default reactionAdd;
