import type { ActionDefinition } from "@w6w/types";
import { YouTubeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `playlists.delete` — DELETE /youtube/v3/playlists
 * https://developers.google.com/youtube/v3/docs/playlists/delete
 *
 * **Quota: 50 units.** No `part` — nothing to write, no response body.
 *
 * Deletes the playlist, not the videos in it. The videos themselves are
 * untouched; only the collection goes.
 */
const deletePlaylist: ActionDefinition<Input> = {
  key: "delete-playlist",
  type: "perform",
  resource: "playlist",
  title: "Delete Playlist",
  description:
    "Delete a playlist owned by the authenticated user. Costs 50 quota units. Removes the playlist only — the videos it contained are not affected.",
  idempotent: true,
  params: [{ key: "id", label: "Playlist ID", type: "string", required: true }],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const client = new YouTubeClient(ctx);
    await client.request("/playlists", { method: "DELETE", query: { id: input.id } });
    return { deleted: true };
  },
};

export default deletePlaylist;
