import type { ActionDefinition } from "@w6w/types";
import { InstagramClient, seg } from "../lib/client.ts";

interface Input {
  igUserId: string;
  mediaId: string;
  fields?: string;
}

interface Output {
  id: string;
  mentioned_media?: Record<string, unknown>;
}

const DEFAULT_FIELDS =
  "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count";

/**
 * Read a media object whose CAPTION @mentions the account —
 * `GET /{ig-user-id}?fields=mentioned_media.media_id({media-id}){fields}`.
 *
 * Meta gives no list endpoint for caption mentions: the `media_id` comes from the
 * `mentions` webhook payload, and the lookup then goes through field expansion on
 * the account node. The result is `{ id, mentioned_media: { ... } }`. Mentions in
 * stories are not supported, and nothing is returned for media from private
 * accounts.
 */
const getMentionedMedia: ActionDefinition<Input, Output> = {
  key: "get-mentioned-media",
  type: "read",
  resource: "media",
  title: "Get Mentioned Media",
  description:
    "Read a post whose caption @mentions the account, by the media id from a mention webhook.",
  params: [
    { key: "igUserId", label: "Instagram Account ID", type: "string", required: true },
    {
      key: "mediaId",
      label: "Media ID",
      type: "string",
      required: true,
      hint: "The media id delivered in the mention webhook payload.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: DEFAULT_FIELDS,
      hint: "Comma-separated IG Media fields.",
    },
  ],
  output: [{ key: "mentioned_media", type: "object", label: "Mentioned media" }],

  execute(input, ctx) {
    const fields = input.fields || DEFAULT_FIELDS;
    return new InstagramClient(ctx).request<Output>(`/${seg(input.igUserId)}`, {
      params: { fields: `mentioned_media.media_id(${input.mediaId}){${fields}}` },
    });
  },
};

export default getMentionedMedia;
