import type { ActionDefinition } from "@w6w/types";
import { seg, UscreenClient } from "../lib/client.ts";

interface Input {
  contentId: string;
  playlistItemId: string;
}

const playlistItemGet: ActionDefinition<Input> = {
  key: "playlist-item-get",
  type: "read",
  resource: "content",
  title: "Get Playlist Item",
  description: "Fetch one playlist item of a content item.",
  params: [
    {
      "key": "contentId",
      "label": "Content ID",
      "type": "string",
      "required": true,
      "hint": "A video, collection or live event id.",
    },
    { "key": "playlistItemId", "label": "Playlist item ID", "type": "string", "required": true },
  ],
  output: [
    { key: "id", type: "number", label: "Record id (the full vendor object is returned)" },
  ],

  async execute(input, ctx) {
    return (await new UscreenClient(ctx).call<Record<string, unknown>>(
      "GET",
      `/contents/${seg(input.contentId)}/playlist_items/${seg(input.playlistItemId)}`,
      {},
    )) ?? {};
  },
};

export default playlistItemGet;
