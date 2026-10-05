import type { ActionDefinition } from "@w6w/types";
import { InstagramClient, type InstagramListResponse, seg } from "../lib/client.ts";

interface Input {
  hashtagId: string;
  igUserId: string;
  fields?: string;
  limit?: number;
  cursor?: string;
}

const DEFAULT_FIELDS = "id,media_type,permalink,caption,comments_count,like_count,timestamp";

/**
 * Most popular public media tagged with a hashtag — `GET /{ig-hashtag-id}/top_media?user_id=&fields=`. Public photos/videos/albums only
 * (no stories), at most 50 results per page, paged with the `after` cursor only.
 * Needs the Instagram Public Content Access feature; the hashtag id comes from Search
 * Hashtag, and the 30-unique-hashtags-per-7-days limit applies.
 */
const action: ActionDefinition<Input, InstagramListResponse<Record<string, unknown>>> = {
  key: "list-hashtag-top-media",
  type: "read",
  resource: "hashtag",
  title: "List Hashtag Top Media",
  description: "Most popular public media tagged with a hashtag.",
  params: [
    { key: "hashtagId", label: "Hashtag ID", type: "string", required: true },
    { key: "igUserId", label: "Instagram Account ID", type: "string", required: true },
    { key: "fields", label: "Fields", type: "string", default: DEFAULT_FIELDS },
    { key: "limit", label: "Limit", type: "number", default: 25, hint: "At most 50." },
    { key: "cursor", label: "Cursor", type: "string", hint: "`after` cursor." },
  ],
  output: [
    { key: "data", type: "array", label: "Media" },
    { key: "paging", type: "object", label: "Paging cursors" },
  ],

  execute(input, ctx) {
    return new InstagramClient(ctx).request<InstagramListResponse<Record<string, unknown>>>(
      `/${seg(input.hashtagId)}/top_media`,
      {
        params: {
          user_id: input.igUserId,
          fields: input.fields || DEFAULT_FIELDS,
          limit: Math.min(input.limit ?? 25, 50),
          after: input.cursor,
        },
      },
    );
  },
};

export default action;
