import type { ActionDefinition } from "@w6w/types";
import { InstagramClient, seg } from "../lib/client.ts";

interface Input {
  igUserId: string;
  mediaId: string;
  commentId?: string;
  message: string;
}

/**
 * Reply to an @mention — `POST /{ig-user-id}/mentions`:
 *   - caption mention: `media_id` + `message` creates a comment on that media;
 *   - comment mention: add `comment_id` and the reply is created on that comment.
 * Both ids come from the `mentions` webhook payload. Mentions on stories are not
 * supported. Not `idempotent`: a retry posts a second comment.
 */
const replyToMention: ActionDefinition<Input, { id: string }> = {
  key: "reply-to-mention",
  type: "perform",
  resource: "comment",
  title: "Reply to Mention",
  description:
    "Comment on a post whose caption @mentions the account, or reply to a comment that @mentions it.",
  idempotent: false,
  params: [
    { key: "igUserId", label: "Instagram Account ID", type: "string", required: true },
    {
      key: "mediaId",
      label: "Media ID",
      type: "string",
      required: true,
      hint: "The media id from the mention webhook payload.",
    },
    {
      key: "commentId",
      label: "Comment ID",
      type: "string",
      hint: "Set only when replying to a comment that mentions the account.",
    },
    { key: "message", label: "Message", type: "text", required: true },
  ],
  output: [{ key: "id", type: "string", label: "Comment ID" }],

  execute(input, ctx) {
    return new InstagramClient(ctx).request<{ id: string }>(`/${seg(input.igUserId)}/mentions`, {
      method: "POST",
      params: { media_id: input.mediaId, comment_id: input.commentId, message: input.message },
    });
  },
};

export default replyToMention;
