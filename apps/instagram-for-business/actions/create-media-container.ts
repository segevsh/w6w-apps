import type { ActionDefinition } from "@w6w/types";
import { csv, InstagramClient, jsonParam, seg } from "../lib/client.ts";

type Kind = "IMAGE" | "VIDEO" | "REELS" | "STORIES";

interface Input {
  igUserId: string;
  mediaType?: Kind;
  imageUrl?: string;
  videoUrl?: string;
  caption?: string;
  altText?: string;
  locationId?: string;
  userTags?: unknown;
  collaborators?: string | string[];
  isCarouselItem?: boolean;
  shareToFeed?: boolean;
  coverUrl?: string;
  thumbOffset?: number;
  audioName?: string;
  trialGraduationStrategy?: "MANUAL" | "SS_PERFORMANCE";
  isAiGenerated?: boolean;
}

/**
 * Step 1 of publishing — create a media container: `POST /{ig-user-id}/media`.
 *
 *   IMAGE   `image_url` (JPEG only, ≤ 8 MB) — no `media_type` is sent;
 *   VIDEO   `media_type=VIDEO` + `video_url` (the carousel-item video form);
 *   REELS   `media_type=REELS` + `video_url`;
 *   STORIES `media_type=STORIES` + `image_url` or `video_url`.
 *
 * Media is fetched by Meta from a PUBLIC url. Containers expire after 24 hours,
 * and an account may create 400 containers per rolling 24h. Resumable (binary)
 * video upload runs against `rupload.facebook.com` and is not offered here.
 * Video containers finish asynchronously — poll Get Container Status until
 * `FINISHED` before publishing. For a carousel, create each item with
 * `isCarouselItem` on, then use Create Carousel Container.
 *
 * Not `idempotent`: every call mints a new container.
 */
const createMediaContainer: ActionDefinition<Input, { id: string }> = {
  key: "create-media-container",
  type: "perform",
  resource: "media",
  title: "Create Media Container",
  description:
    "Publishing step 1: create a container for a photo, video, reel or story (or a carousel item) from a public URL.",
  idempotent: false,
  params: [
    { key: "igUserId", label: "Instagram Account ID", type: "string", required: true },
    {
      key: "mediaType",
      label: "Media type",
      type: "select",
      default: "IMAGE",
      options: [
        { value: "IMAGE", label: "Photo" },
        { value: "VIDEO", label: "Video (carousel item)" },
        { value: "REELS", label: "Reel" },
        { value: "STORIES", label: "Story" },
      ],
    },
    {
      key: "imageUrl",
      label: "Image URL",
      type: "string",
      hint: "Public JPEG URL. Required for a photo; a story takes this or a video URL.",
    },
    {
      key: "videoUrl",
      label: "Video URL",
      type: "string",
      hint: "Public video URL. Required for video and reels.",
    },
    {
      key: "caption",
      label: "Caption",
      type: "text",
      hint: "Up to 2,200 characters, 30 hashtags, 20 @tags. Not supported on carousel items.",
    },
    {
      key: "altText",
      label: "Alt text",
      type: "string",
      hint: "Photos only, up to 1,000 characters.",
    },
    { key: "locationId", label: "Location Page ID", type: "string" },
    {
      key: "userTags",
      label: "User tags",
      type: "json",
      hint: 'Array like [{"username":"someone","x":0.5,"y":0.8}]. x/y required on images.',
    },
    {
      key: "collaborators",
      label: "Collaborators",
      type: "string",
      hint: "Up to 3 usernames, comma-separated. Feed images, reels and carousels only.",
    },
    {
      key: "isCarouselItem",
      label: "Carousel item",
      type: "boolean",
      hint: "On when this container will be a child of a carousel.",
    },
    { key: "shareToFeed", label: "Share reel to feed", type: "boolean" },
    { key: "coverUrl", label: "Reel cover URL", type: "string" },
    {
      key: "thumbOffset",
      label: "Thumbnail offset (ms)",
      type: "number",
      hint: "Frame to use as the cover; ignored when a cover URL is given.",
    },
    { key: "audioName", label: "Audio name", type: "string", hint: "Reels only." },
    {
      key: "trialGraduationStrategy",
      label: "Trial reel graduation",
      type: "select",
      options: [
        { value: "MANUAL", label: "Manual" },
        { value: "SS_PERFORMANCE", label: "Automatic on performance" },
      ],
      hint: "Set to publish a trial reel (shown only to non-followers). Reels only.",
    },
    {
      key: "isAiGenerated",
      label: "AI-generated",
      type: "boolean",
      hint: "Self-disclosure of AI usage.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Container ID" }],

  async execute(input, ctx) {
    const kind: Kind = input.mediaType ?? "IMAGE";
    if (kind === "IMAGE" && !input.imageUrl) throw new Error("imageUrl is required for a photo");
    if ((kind === "VIDEO" || kind === "REELS") && !input.videoUrl) {
      throw new Error(`videoUrl is required for ${kind === "REELS" ? "a reel" : "a video"}`);
    }
    if (kind === "STORIES" && !input.imageUrl && !input.videoUrl) {
      throw new Error("a story needs an imageUrl or a videoUrl");
    }
    if (kind === "STORIES" && input.imageUrl && input.videoUrl) {
      throw new Error("a story takes an imageUrl or a videoUrl, not both");
    }

    const url = kind === "IMAGE"
      ? { image_url: input.imageUrl }
      : kind === "STORIES"
      ? { image_url: input.imageUrl, video_url: input.videoUrl }
      : { video_url: input.videoUrl };

    return await new InstagramClient(ctx).request<{ id: string }>(`/${seg(input.igUserId)}/media`, {
      method: "POST",
      params: {
        media_type: kind === "IMAGE" ? undefined : kind,
        ...url,
        caption: input.caption,
        alt_text: input.altText,
        location_id: input.locationId,
        user_tags: jsonParam(input.userTags),
        collaborators: jsonParam(csv(input.collaborators)?.split(",")),
        is_carousel_item: input.isCarouselItem,
        share_to_feed: input.shareToFeed,
        cover_url: input.coverUrl,
        thumb_offset: input.thumbOffset,
        audio_name: input.audioName,
        trial_params: input.trialGraduationStrategy
          ? JSON.stringify({ graduation_strategy: input.trialGraduationStrategy })
          : undefined,
        is_ai_generated: input.isAiGenerated,
      },
    });
  },
};

export default createMediaContainer;
