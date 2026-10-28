import type { ActionDefinition } from "@w6w/types";
import { InstagramClient, type InstagramListResponse, seg } from "../lib/client.ts";

interface Input {
  igUserId: string;
  fields?: string;
  since?: string;
  until?: string;
  limit?: number;
  cursor?: string;
}

const DEFAULT_FIELDS =
  "id,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count";

/**
 * List an account's media — `GET /{ig-user-id}/media`. Returns at most the 10,000
 * most recent items; stories are NOT included (use List Stories). The edge
 * supports time-based pagination through `since` / `until` (Unix timestamp or
 * strtotime value) as well as cursors.
 */
const listMedia: ActionDefinition<Input, InstagramListResponse<Record<string, unknown>>> = {
  key: "list-media",
  type: "read",
  resource: "media",
  title: "List Media",
  description: "List an Instagram account's published posts and reels, newest first.",
  params: [
    { key: "igUserId", label: "Instagram Account ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: DEFAULT_FIELDS,
      hint: "Comma-separated IG Media fields.",
    },
    {
      key: "since",
      label: "Since",
      type: "string",
      hint: "Unix timestamp or strtotime date; only media after this.",
    },
    {
      key: "until",
      label: "Until",
      type: "string",
      hint: "Unix timestamp or strtotime date; only media before this.",
    },
    { key: "limit", label: "Limit", type: "number", default: 25 },
    { key: "cursor", label: "Cursor", type: "string", hint: "`after` cursor for pagination." },
  ],
  output: [
    { key: "data", type: "array", label: "Media" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  execute(input, ctx) {
    return new InstagramClient(ctx).request<InstagramListResponse<Record<string, unknown>>>(
      `/${seg(input.igUserId)}/media`,
      {
        params: {
          fields: input.fields || DEFAULT_FIELDS,
          since: input.since,
          until: input.until,
          limit: input.limit ?? 25,
          after: input.cursor,
        },
      },
    );
  },
};

export default listMedia;
