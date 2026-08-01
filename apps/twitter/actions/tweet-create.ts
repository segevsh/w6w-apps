import type { ActionDefinition } from "@w6w/types";
import { base64ToBytes, dataUrlMime, TwitterClient, uploadMedia } from "../lib/client.ts";

interface Input {
  text?: string;
  media?: string;
  mediaMimeType?: string;
  mediaCategory?: string;
  replyToTweetId?: string;
  quoteTweetId?: string;
}

interface Tweet {
  data: { id: string; text: string; edit_history_tweet_ids?: string[] };
}

/**
 * `POST /2/tweets` (tweet.read + tweet.write + users.read).
 *
 * Media is optional and, when supplied, goes through the v2 chunked
 * media-upload endpoint first (INIT -> APPEND -> FINALIZE, single chunk —
 * see `lib/client.ts#uploadMedia`), then the returned `media_id` is attached
 * via `media.media_ids`. That upload path is sized for images/GIFs; a
 * multi-segment APPEND loop for large video uploads is out of scope here.
 *
 * Billing (X's pay-per-use pricing, current as of 2026-07-31): post creation
 * is billed per request, at a higher rate if the text contains a URL — see
 * this app's README for the current published rates and how to verify them.
 */
const tweetCreate: ActionDefinition<Input, Tweet["data"]> = {
  key: "tweet-create",
  type: "perform",
  resource: "tweet",
  title: "Create Tweet",
  description: "Post a tweet, optionally with one image/GIF attached, a reply, or a quote tweet.",
  // Posting is billed per request and X assigns a new id per call with no
  // idempotency key, so a retry after a transient failure risks a duplicate post.
  idempotent: false,
  params: [
    {
      key: "text",
      label: "Text",
      type: "text",
      hint:
        "Up to 280 characters (fewer if the account isn't subscribed to X Premium). Required unless media is attached.",
    },
    {
      key: "media",
      label: "Media (base64)",
      type: "file",
      hint:
        "A single image or GIF, base64-encoded (a `data:<mime>;base64,...` URL or bare base64 + Media MIME type below).",
    },
    {
      key: "mediaMimeType",
      label: "Media MIME type",
      type: "string",
      placeholder: "image/png",
      hint: "Only needed when Media isn't a `data:` URL.",
    },
    {
      key: "mediaCategory",
      label: "Media category",
      type: "select",
      default: "tweet_image",
      options: [
        { value: "tweet_image", label: "Image" },
        { value: "tweet_gif", label: "GIF" },
      ],
    },
    {
      key: "replyToTweetId",
      label: "Reply to tweet ID",
      type: "string",
      hint: "Leave empty for a standalone tweet.",
    },
    {
      key: "quoteTweetId",
      label: "Quote tweet ID",
      type: "string",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Tweet ID" },
    { key: "text", type: "string", label: "Text" },
  ],

  async execute(input, ctx) {
    if (!input.text && !input.media) {
      throw new Error("tweet-create needs `text`, `media`, or both");
    }

    const body: Record<string, unknown> = {};
    if (input.text) body.text = input.text;
    if (input.replyToTweetId) body.reply = { in_reply_to_tweet_id: input.replyToTweetId };
    if (input.quoteTweetId) body.quote_tweet_id = input.quoteTweetId;

    if (input.media) {
      const mimeType = dataUrlMime(input.media) ?? input.mediaMimeType ?? "image/png";
      const bytes = base64ToBytes(input.media);
      const uploaded = await uploadMedia(
        ctx,
        bytes,
        mimeType,
        input.mediaCategory ?? "tweet_image",
      );
      body.media = { media_ids: [uploaded.mediaId] };
    }

    const res = await new TwitterClient(ctx).request<Tweet>("/tweets", { method: "POST", body });
    return res.data;
  },
};

export default tweetCreate;
