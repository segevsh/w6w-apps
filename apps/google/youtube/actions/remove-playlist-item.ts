import type { ActionDefinition } from "@w6w/types";
import { YouTubeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `playlistItems.delete` — DELETE /youtube/v3/playlistItems
 * https://developers.google.com/youtube/v3/docs/playlistItems/delete
 *
 * **Quota: 50 units.** No `part`.
 *
 * `id` is the **playlist item id** — the id of the membership — and not the
 * video id. Passing a video id here 404s. Get the right one from
 * `list-playlist-items`, optionally narrowed with its Video ID filter; it is the
 * `id` field of the item, while the video is at `snippet.resourceId.videoId`.
 */
const removePlaylistItem: ActionDefinition<Input> = {
  key: "remove-playlist-item",
  type: "perform",
  resource: "playlistItem",
  title: "Remove Video From Playlist",
  description:
    "Remove an entry from a playlist. Costs 50 quota units. Takes the playlist ITEM ID, not the video ID — find it with List Playlist Items.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Playlist item ID",
      type: "string",
      required: true,
      hint:
        "The membership ID from List Playlist Items (`items[].id`), NOT the video ID at snippet.resourceId.videoId.",
    },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const client = new YouTubeClient(ctx);
    await client.request("/playlistItems", { method: "DELETE", query: { id: input.id } });
    return { deleted: true };
  },
};

export default removePlaylistItem;
