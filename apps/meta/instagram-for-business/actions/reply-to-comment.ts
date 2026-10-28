import type { ActionDefinition } from "@w6w/types";
import { InstagramClient, seg } from "../lib/client.ts";

interface Input {
  commentId: string;
  message: string;
}

/**
 * Reply to a comment — `POST /{ig-comment-id}/replies?message=`. Only top-level
 * comments can be replied to (a reply to a reply lands on the top-level comment),
 * hidden comments cannot be replied to, and comments on live video are not
 * supported. Not `idempotent`: a retry posts a second reply.
 */
const replyToComment: ActionDefinition<Input, { id: string }> = {
  key: "reply-to-comment",
  type: "perform",
  resource: "comment",
  title: "Reply to Comment",
  description: "Reply to a comment on an Instagram post.",
  idempotent: false,
  params: [
    { key: "commentId", label: "Comment ID", type: "string", required: true },
    { key: "message", label: "Message", type: "text", required: true },
  ],
  output: [{ key: "id", type: "string", label: "Reply ID" }],

  execute(input, ctx) {
    return new InstagramClient(ctx).request<{ id: string }>(`/${seg(input.commentId)}/replies`, {
      method: "POST",
      params: { message: input.message },
    });
  },
};

export default replyToComment;
