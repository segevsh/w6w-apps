import type { ActionDefinition } from "@w6w/types";
import { InstagramClient, type InstagramListResponse, seg } from "../lib/client.ts";

interface Input {
  mediaId: string;
  fields?: string;
  limit?: number;
  cursor?: string;
}

const DEFAULT_FIELDS = "id,text,timestamp,username,like_count,hidden";

/**
 * List the top-level comments on a media object — `GET /{ig-media-id}/comments`.
 * Returns only top-level comments (request the `replies` field expansion, or use
 * List Comment Replies, for replies), newest first, at most 50 per page, and
 * cannot be filtered by time. `username` needs `instagram_manage_comments`.
 */
const listComments: ActionDefinition<Input, InstagramListResponse<Record<string, unknown>>> = {
  key: "list-comments",
  type: "read",
  resource: "comment",
  title: "List Comments",
  description: "List the top-level comments on an Instagram post.",
  params: [
    { key: "mediaId", label: "Media ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: DEFAULT_FIELDS,
      hint: "Comma-separated IG Comment fields (e.g. add `replies{id,text}`).",
    },
    { key: "limit", label: "Limit", type: "number", default: 25, hint: "At most 50 per page." },
    { key: "cursor", label: "Cursor", type: "string", hint: "`after` cursor for pagination." },
  ],
  output: [
    { key: "data", type: "array", label: "Comments" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  execute(input, ctx) {
    return new InstagramClient(ctx).request<InstagramListResponse<Record<string, unknown>>>(
      `/${seg(input.mediaId)}/comments`,
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

export default listComments;
