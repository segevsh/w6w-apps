import type { ActionDefinition } from "@w6w/types";
import { FacebookClient, type FacebookListResponse } from "../lib/client.ts";

interface Input {
  pageId: string;
  since?: string;
  until?: string;
  limit?: number;
  cursor?: string;
}

interface PostSummary {
  id: string;
  message?: string;
  created_time?: string;
  permalink_url?: string;
  full_picture?: string;
}

/**
 * List a Page's own posts — `GET /{page-id}/feed`. Returns posts published by
 * the Page (and, depending on the Page's settings, visitor posts) newest
 * first.
 */
const listPosts: ActionDefinition<Input, FacebookListResponse<PostSummary>> = {
  key: "list-posts",
  type: "read",
  resource: "post",
  title: "List Posts",
  description: "List a Page's posts from its feed.",
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true },
    {
      key: "since",
      label: "Since",
      type: "string",
      hint: "Unix timestamp or strtotime-compatible date; only posts after this.",
    },
    {
      key: "until",
      label: "Until",
      type: "string",
      hint: "Unix timestamp or strtotime-compatible date; only posts before this.",
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
    { key: "data", type: "array", label: "Posts" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  execute(input, ctx) {
    const client = new FacebookClient(ctx);
    return client.request<FacebookListResponse<PostSummary>>(`/${input.pageId}/feed`, {
      params: {
        fields: "id,message,created_time,permalink_url,full_picture",
        since: input.since,
        until: input.until,
        limit: input.limit ?? 25,
        after: input.cursor,
      },
    });
  },
};

export default listPosts;
