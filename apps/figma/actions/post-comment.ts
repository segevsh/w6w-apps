import type { ActionDefinition } from "@w6w/types";
import { FigmaClient } from "../lib/client.ts";

interface Input {
  fileKey: string;
  message: string;
  commentId?: string;
  clientMeta?: Record<string, unknown>;
}

/**
 * POST /v1/files/{file_key}/comments — post a new comment, or a reply when
 * `commentId` names the root comment of an existing thread. Requires
 * `file_comments:write`.
 */
const postComment: ActionDefinition<Input> = {
  key: "post-comment",
  type: "perform",
  resource: "comment",
  title: "Post Comment",
  description: "Post a comment on a file, optionally as a reply to an existing thread.",
  idempotent: false,
  params: [
    { key: "fileKey", label: "File key", type: "string", required: true },
    { key: "message", label: "Message", type: "text", required: true },
    {
      key: "commentId",
      label: "Reply to comment ID",
      type: "string",
      hint: "The root comment ID of the thread to reply to. Omit to start a new thread.",
    },
    {
      key: "clientMeta",
      label: "Position",
      type: "json",
      hint:
        'Where to pin the comment: a canvas point `{ "x": 1, "y": 2 }`, or a frame-relative offset ' +
        '`{ "node_id": "1:2", "node_offset": { "x": 1, "y": 2 } }`. Omit for a file-level comment.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "message", type: "string", label: "Message" },
    { key: "file_key", type: "string", label: "File key" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "user", type: "object", label: "Author" },
    { key: "client_meta", type: "object", label: "Position" },
  ],

  execute(input, ctx) {
    const client = new FigmaClient(ctx);
    const body: Record<string, unknown> = { message: input.message };
    if (input.commentId) body.comment_id = input.commentId;
    if (input.clientMeta) body.client_meta = input.clientMeta;
    return client.request(`/v1/files/${encodeURIComponent(input.fileKey)}/comments`, {
      method: "POST",
      body,
    });
  },
};

export default postComment;
