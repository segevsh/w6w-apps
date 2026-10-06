import type { ActionDefinition } from "@w6w/types";
import { requireText, SupadataClient } from "../lib/client.ts";

interface Input {
  url: string;
}

const metadataGet: ActionDefinition<Input> = {
  key: "metadata-get",
  type: "read",
  resource: "metadata",
  title: "Get Media Metadata",
  description:
    "Get unified metadata (title, author, stats, media, tags, publish time) for a YouTube, " +
    "TikTok, Instagram, X (Twitter) or Facebook post. 1 credit.",
  params: [{
    key: "url",
    label: "Post URL",
    type: "string",
    required: true,
    placeholder: "https://www.tiktok.com/@user/video/123",
  }],
  output: [
    { key: "platform", type: "string", label: "youtube, tiktok, instagram, twitter or facebook" },
    { key: "type", type: "string", label: "video, image, carousel or post" },
    { key: "id", type: "string", label: "Platform id" },
    { key: "title", type: "string", label: "Title" },
    { key: "author", type: "object", label: "Author" },
    {
      key: "stats",
      type: "object",
      label: "views, likes, comments, shares (null when unavailable)",
    },
    { key: "media", type: "object", label: "Media details, discriminated by type" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "createdAt", type: "string", label: "Published at (ISO 8601)" },
    { key: "additionalData", type: "object", label: "Platform-specific extras" },
  ],

  async execute(input, ctx) {
    return await new SupadataClient(ctx).json("/metadata", {
      query: { url: requireText(input.url, "Post URL") },
    });
  },
};

export default metadataGet;
