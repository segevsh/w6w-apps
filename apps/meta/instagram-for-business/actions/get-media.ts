import type { ActionDefinition } from "@w6w/types";
import { InstagramClient, seg } from "../lib/client.ts";

interface Input {
  mediaId: string;
  fields?: string;
}

const DEFAULT_FIELDS =
  "id,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count,is_comment_enabled";

/**
 * Get one IG Media object — `GET /{ig-media-id}`. `media_url` is omitted by Meta
 * for videos with licensed audio and for reels whose owner disabled downloads;
 * fall back to `permalink` / `thumbnail_url`. `permalink` cannot be read on a
 * carousel child.
 */
const getMedia: ActionDefinition<Input, Record<string, unknown>> = {
  key: "get-media",
  type: "read",
  resource: "media",
  title: "Get Media",
  description: "Get one Instagram post, reel, story or carousel by id.",
  params: [
    { key: "mediaId", label: "Media ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: DEFAULT_FIELDS,
      hint: "Comma-separated IG Media fields.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Media ID" },
    { key: "media_type", type: "string", label: "Media type" },
    { key: "permalink", type: "string", label: "Permalink" },
  ],

  execute(input, ctx) {
    return new InstagramClient(ctx).request<Record<string, unknown>>(`/${seg(input.mediaId)}`, {
      params: { fields: input.fields || DEFAULT_FIELDS },
    });
  },
};

export default getMedia;
