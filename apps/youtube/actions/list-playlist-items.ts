import type { ActionDefinition } from "@w6w/types";
import { csv, partParam, YouTubeClient } from "../lib/client.ts";

interface Input {
  part: string | string[];
  playlistId?: string;
  id?: string | string[];
  videoId?: string;
  maxResults?: number;
  pageToken?: string;
}

/**
 * `playlistItems.list` — GET /youtube/v3/playlistItems
 * https://developers.google.com/youtube/v3/docs/playlistItems/list
 *
 * **Quota: 1 unit per page.** This is the cheap way to enumerate a channel's
 * videos: take `contentDetails.relatedPlaylists.uploads` from `get-channels` and
 * page through it here at 1 unit per 50 videos, instead of burning the 100-call
 * daily `search` bucket.
 *
 * Exactly one of `playlistId` or `id` is required. `videoId` is a *filter within*
 * a playlist, not a filter on its own — it narrows a `playlistId` query to the
 * entries for one video, which is how you find the playlist-item id needed by
 * `remove-playlist-item`.
 *
 * The item id and the video id are different things, and confusing them is the
 * usual reason a removal fails: `id` is the membership, `snippet.resourceId.videoId`
 * is the video.
 */
const listPlaylistItems: ActionDefinition<Input> = {
  key: "list-playlist-items",
  type: "read",
  resource: "playlistItem",
  title: "List Playlist Items",
  description:
    "List the entries in a playlist. Costs 1 quota unit per page. Each item's `id` is the membership ID needed to remove it — not the video ID, which is at snippet.resourceId.videoId.",
  params: [
    partParam(
      "playlistItem",
      "snippet,contentDetails",
      "Sections to return. `contentDetails` carries the video ID and publish time; `status` carries the item's privacy.",
    ),
    {
      key: "playlistId",
      label: "Playlist ID",
      type: "string",
      hint: "Required unless Playlist item IDs is given.",
    },
    {
      key: "id",
      label: "Playlist item IDs",
      type: "multiselect",
      hint: "Fetch specific entries by membership ID. Mutually exclusive with Playlist ID.",
    },
    {
      key: "videoId",
      label: "Video ID filter",
      type: "string",
      hint:
        "Narrows a Playlist ID query to the entries for one video. Use this to find the membership ID for removal.",
    },
    {
      key: "maxResults",
      label: "Max results",
      type: "number",
      hint: "0–50. Google's default is 5.",
      validation: { integer: true, min: 0, max: 50 },
    },
    { key: "pageToken", label: "Page token", type: "string" },
  ],
  output: [
    { key: "items", type: "array", label: "Playlist items" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
    { key: "prevPageToken", type: "string", label: "Previous page token" },
    { key: "pageInfo", type: "object", label: "Page info" },
    { key: "kind", type: "string", label: "Resource kind" },
  ],

  execute(input, ctx) {
    const id = csv(input.id);
    const filters = [input.playlistId, id].filter(Boolean);
    if (filters.length !== 1) {
      throw new Error(
        "list-playlist-items: supply exactly one of `playlistId` or `id` — the API rejects zero or both",
      );
    }

    const client = new YouTubeClient(ctx);
    return client.request("/playlistItems", {
      part: input.part,
      query: {
        playlistId: input.playlistId,
        id,
        videoId: input.videoId,
        maxResults: input.maxResults,
        pageToken: input.pageToken,
      },
    });
  },
};

export default listPlaylistItems;
