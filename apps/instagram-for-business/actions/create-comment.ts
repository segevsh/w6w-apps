import type { ActionDefinition } from "@w6w/types";
import { InstagramClient, seg } from "../lib/client.ts";

interface Input {
  mediaId: string;
  message: string;
}

/**
 * Comment on a media object — `POST /{ig-media-id}/comments?message=`. Not
 * supported on live-video media. Not `idempotent`: a retry posts a second comment.
 */
const createComment: ActionDefinition<Input, { id: string }> = {
  key: "create-comment",
  type: "perform",
  resource: "comment",
  title: "Create Comment",
  description: "Post a top-level comment on an Instagram post.",
  idempotent: false,
  params: [
    { key: "mediaId", label: "Media ID", type: "string", required: true },
    { key: "message", label: "Message", type: "text", required: true },
  ],
  output: [{ key: "id", type: "string", label: "Comment ID" }],

  execute(input, ctx) {
    return new InstagramClient(ctx).request<{ id: string }>(`/${seg(input.mediaId)}/comments`, {
      method: "POST",
      params: { message: input.message },
    });
  },
};

export default createComment;
