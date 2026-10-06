import type { ActionDefinition } from "@w6w/types";
import { requireText, SupadataClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const youtubeChannelGet: ActionDefinition<Input> = {
  key: "youtube-channel-get",
  type: "read",
  resource: "youtube",
  title: "Get YouTube Channel",
  description:
    "Get a YouTube channel's name, handle, subscriber, video and view counts, and images.",
  params: [{
    key: "id",
    label: "Channel URL, handle or id",
    type: "string",
    required: true,
    placeholder: "https://www.youtube.com/@RickAstleyYT",
  }],
  output: [
    { key: "id", type: "string", label: "Channel id" },
    { key: "name", type: "string", label: "Name" },
    { key: "handle", type: "string", label: "Handle" },
    { key: "subscriberCount", type: "number", label: "Subscribers" },
    { key: "videoCount", type: "number", label: "Videos" },
    { key: "viewCount", type: "number", label: "Views" },
    { key: "thumbnail", type: "string", label: "Avatar URL" },
    { key: "banner", type: "string", label: "Banner URL" },
  ],

  async execute(input, ctx) {
    return await new SupadataClient(ctx).json("/youtube/channel", {
      query: { id: requireText(input.id, "Channel") },
    });
  },
};

export default youtubeChannelGet;
