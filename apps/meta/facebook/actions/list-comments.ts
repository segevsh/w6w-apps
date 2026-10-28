import type { ActionDefinition } from "@w6w/types";
import { FacebookClient, type FacebookListResponse } from "../lib/client.ts";

interface Input {
  postId: string;
  order?: "chronological" | "reverse_chronological";
  limit?: number;
  cursor?: string;
}

interface CommentSummary {
  id: string;
  message?: string;
  created_time?: string;
  from?: { id?: string; name?: string };
}

/**
 * List comments on a post — `GET /{post-id}/comments`.
 */
const listComments: ActionDefinition<Input, FacebookListResponse<CommentSummary>> = {
  key: "list-comments",
  type: "read",
  resource: "comment",
  title: "List Comments",
  description: "List the comments on a post.",
  params: [
    { key: "postId", label: "Post ID", type: "string", required: true },
    {
      key: "order",
      label: "Order",
      type: "select",
      default: "chronological",
      options: [
        { value: "chronological", label: "Oldest first" },
        { value: "reverse_chronological", label: "Newest first" },
      ],
    },
    { key: "limit", label: "Limit", type: "number", default: 25 },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "Facebook `after` cursor for pagination.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Comments" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  execute(input, ctx) {
    const client = new FacebookClient(ctx);
    return client.request<FacebookListResponse<CommentSummary>>(`/${input.postId}/comments`, {
      params: {
        fields: "id,message,created_time,from",
        order: input.order ?? "chronological",
        limit: input.limit ?? 25,
        after: input.cursor,
      },
    });
  },
};

export default listComments;
