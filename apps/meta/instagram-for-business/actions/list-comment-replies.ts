import type { ActionDefinition } from "@w6w/types";
import { InstagramClient, type InstagramListResponse, seg } from "../lib/client.ts";

interface Input {
  commentId: string;
  fields?: string;
  limit?: number;
  cursor?: string;
}

const DEFAULT_FIELDS = "id,text,timestamp,username,like_count";

/** List the replies to a comment — `GET /{ig-comment-id}/replies`. */
const listCommentReplies: ActionDefinition<Input, InstagramListResponse<Record<string, unknown>>> =
  {
    key: "list-comment-replies",
    type: "read",
    resource: "comment",
    title: "List Comment Replies",
    description: "List the replies made to a comment.",
    params: [
      { key: "commentId", label: "Comment ID", type: "string", required: true },
      {
        key: "fields",
        label: "Fields",
        type: "string",
        default: DEFAULT_FIELDS,
        hint: "Comma-separated IG Comment fields.",
      },
      { key: "limit", label: "Limit", type: "number", default: 25 },
      { key: "cursor", label: "Cursor", type: "string", hint: "`after` cursor for pagination." },
    ],
    output: [
      { key: "data", type: "array", label: "Replies" },
      { key: "paging", type: "object", label: "Paging" },
    ],

    execute(input, ctx) {
      return new InstagramClient(ctx).request<InstagramListResponse<Record<string, unknown>>>(
        `/${seg(input.commentId)}/replies`,
        {
          params: {
            fields: input.fields || DEFAULT_FIELDS,
            limit: input.limit ?? 25,
            after: input.cursor,
          },
        },
      );
    },
  };

export default listCommentReplies;
