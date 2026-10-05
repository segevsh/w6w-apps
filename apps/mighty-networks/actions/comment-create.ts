import type { ActionDefinition } from "@w6w/types";
import { compact, MightyClient, seg } from "../lib/client.ts";

/** `POST /posts/{post_id}/comments` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
interface Input {
  postId: number;
  text: string;
  replyToId?: number;
}

const commentCreate: ActionDefinition<Input> = {
  key: "comment-create",
  type: "perform",
  resource: "comment",
  title: "Create Comment",
  description: "Comment on a post, or reply to a comment.",
  idempotent: false,
  params: [
    {
      key: "postId",
      label: "Post ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    { key: "text", label: "Text", type: "text", required: true },
    {
      key: "replyToId",
      label: "Reply to comment ID",
      type: "number",
      hint: "Parent comment id when this is a reply.",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "id", type: "number", label: "Comment id" },
    { key: "text", type: "string", label: "Comment text (HTML)" },
    { key: "targetable_id", type: "number", label: "Id of the commented item" },
    { key: "targetable_type", type: "string", label: "Type of the commented item" },
    { key: "author_id", type: "number", label: "Author user id" },
    { key: "space_id", type: "number", label: "Space id" },
    { key: "reply_to_id", type: "number", label: "Parent comment id" },
    { key: "depth", type: "number", label: "Nesting depth" },
    { key: "reply_count", type: "number", label: "Reply count" },
    { key: "permalink", type: "string", label: "Comment URL" },
    { key: "created_at", type: "string", label: "Created (ISO 8601)" },
  ],

  execute(input, ctx) {
    return new MightyClient(ctx).request(`/posts/${seg(input.postId)}/comments`, {
      method: "POST",
      body: compact({ text: input.text, reply_to_id: input.replyToId }),
    });
  },
};

export default commentCreate;
