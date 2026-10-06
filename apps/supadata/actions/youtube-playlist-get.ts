import type { ActionDefinition } from "@w6w/types";
import { requireText, SupadataClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const youtubePlaylistGet: ActionDefinition<Input> = {
  key: "youtube-playlist-get",
  type: "read",
  resource: "youtube",
  title: "Get YouTube Playlist",
  description: "Get a YouTube playlist's title, video and view counts, owner and last update.",
  params: [{ key: "id", label: "Playlist URL or id", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Playlist id" },
    { key: "title", type: "string", label: "Title" },
    { key: "videoCount", type: "number", label: "Videos" },
    { key: "viewCount", type: "number", label: "Views" },
    { key: "lastUpdated", type: "string", label: "Last updated (ISO 8601)" },
    { key: "channel", type: "object", label: "Owner channel (id, name)" },
  ],

  async execute(input, ctx) {
    return await new SupadataClient(ctx).json("/youtube/playlist", {
      query: { id: requireText(input.id, "Playlist") },
    });
  },
};

export default youtubePlaylistGet;
