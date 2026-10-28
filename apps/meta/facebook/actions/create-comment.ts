import type { ActionDefinition } from "@w6w/types";
import { FacebookClient } from "../lib/client.ts";

interface Input {
  postId: string;
  message: string;
}

/**
 * Comment on a post — `POST /{post-id}/comments`.
 *
 * Not `idempotent`: a retried call posts a second, identical comment.
 */
const createComment: ActionDefinition<Input, { id: string }> = {
  key: "create-comment",
  type: "perform",
  resource: "comment",
  title: "Create Comment",
  description: "Post a comment on a post.",
  idempotent: false,
  params: [
    { key: "postId", label: "Post ID", type: "string", required: true },
    { key: "message", label: "Message", type: "text", required: true },
  ],
  output: [{ key: "id", type: "string", label: "Comment ID" }],

  execute(input, ctx) {
    const client = new FacebookClient(ctx);
    return client.request<{ id: string }>(`/${input.postId}/comments`, {
      method: "POST",
      params: { message: input.message },
    });
  },
};

export default createComment;
