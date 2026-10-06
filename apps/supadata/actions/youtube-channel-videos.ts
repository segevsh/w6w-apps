import type { ActionDefinition } from "@w6w/types";
import { compact, requireText, SupadataClient } from "../lib/client.ts";

interface Input {
  id: string;
  type?: "all" | "video" | "short" | "live";
  limit?: number;
}

const youtubeChannelVideos: ActionDefinition<Input> = {
  key: "youtube-channel-videos",
  type: "read",
  resource: "youtube",
  title: "List YouTube Channel Videos",
  description: "List the video, Short and live-stream ids of a YouTube channel.",
  params: [
    { key: "id", label: "Channel URL, handle or id", type: "string", required: true },
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "all",
      options: [
        { value: "all", label: "All" },
        { value: "video", label: "Videos" },
        { value: "short", label: "Shorts" },
        { value: "live", label: "Live" },
      ],
    },
    {
      key: "limit",
      label: "Max ids",
      type: "number",
      default: 30,
      validation: { integer: true, min: 1, max: 5000 },
    },
  ],
  output: [
    { key: "videoIds", type: "array", label: "Video ids" },
    { key: "shortIds", type: "array", label: "Short ids" },
    { key: "liveIds", type: "array", label: "Live ids" },
  ],

  async execute(input, ctx) {
    return await new SupadataClient(ctx).json("/youtube/channel/videos", {
      query: compact({
        id: requireText(input.id, "Channel"),
        type: input.type,
        limit: input.limit,
      }),
    });
  },
};

export default youtubeChannelVideos;
