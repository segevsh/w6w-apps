import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/attachments/remove`
 *
 * Remove an attachment from a thread, comment or conversation message. Uploading is not offered: it needs multipart file bytes.
 */
interface Input {
  attachmentId: number;
  threadId?: number;
  commentId?: number;
  messageId?: number;
}

const attachmentRemove: ActionDefinition<Input> = {
  key: "attachment-remove",
  type: "perform",
  resource: "attachment",
  title: "Remove Attachment",
  description:
    "Remove an attachment from a thread, comment or conversation message. Uploading is not offered: it needs multipart file bytes.",
  idempotent: true,
  params: [
    { key: "attachmentId", label: "Attachment ID", type: "number", required: true },
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
      path: "/attachments/remove",
      params: {
        "attachment_id": input.attachmentId,
        "thread_id": input.threadId,
        "comment_id": input.commentId,
        "message_id": input.messageId,
      },
    });
  },
};

export default attachmentRemove;
