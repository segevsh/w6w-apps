import type { ActionDefinition } from "@w6w/types";
import { compact, requireText, SupadataClient } from "../lib/client.ts";

interface Input {
  id: string;
  limit?: number;
}

const youtubePlaylistVideos: ActionDefinition<Input> = {
  key: "youtube-playlist-videos",
  type: "read",
  resource: "youtube",
  title: "List YouTube Playlist Videos",
  description: "List the video, Short and live-stream ids of a YouTube playlist.",
  params: [
    { key: "id", label: "Playlist URL or id", type: "string", required: true },
    {
      key: "limit",
      label: "Max ids",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1, max: 5000 },
    },
  ],
  output: [
    { key: "videoIds", type: "array", label: "Video ids" },
    { key: "shortIds", type: "array", label: "Short ids" },
    { key: "liveIds", type: "array", label: "Live ids" },
  ],

  async execute(input, ctx) {
    return await new SupadataClient(ctx).json("/youtube/playlist/videos", {
      query: compact({ id: requireText(input.id, "Playlist"), limit: input.limit }),
    });
  },
};

export default youtubePlaylistVideos;
