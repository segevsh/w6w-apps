import type { ActionDefinition } from "@w6w/types";
import { FacebookClient, type FacebookListResponse } from "../lib/client.ts";

interface Input {
  pageId: string;
  limit?: number;
  cursor?: string;
}

interface VideoSummary {
  id: string;
  description?: string;
  created_time?: string;
  permalink_url?: string;
  length?: number;
}

/**
 * List a Page's videos — `GET /{page-id}/videos`.
 */
const listVideos: ActionDefinition<Input, FacebookListResponse<VideoSummary>> = {
  key: "list-videos",
  type: "read",
  resource: "video",
  title: "List Videos",
  description: "List a Page's videos.",
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true },
    { key: "limit", label: "Limit", type: "number", default: 25 },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "Facebook `after` cursor for pagination.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Videos" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  execute(input, ctx) {
    const client = new FacebookClient(ctx);
    return client.request<FacebookListResponse<VideoSummary>>(`/${input.pageId}/videos`, {
      params: {
        fields: "id,description,created_time,permalink_url,length",
        limit: input.limit ?? 25,
        after: input.cursor,
      },
    });
  },
};

export default listVideos;
