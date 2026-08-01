import type { ActionDefinition } from "@w6w/types";
import { csv, extractId, SpotifyClient } from "../lib/client.ts";

interface Input {
  playlistId: string;
  trackIds: string;
  position?: number;
}

const toUri = (id: string) => id.startsWith("spotify:") ? id : `spotify:track:${id}`;

/**
 * Add one or more tracks to a playlist.
 * https://developer.spotify.com/documentation/web-api/reference/add-tracks-to-playlist
 * (checked 2026-08-01). `POST /playlists/{playlist_id}/tracks`, up to 100
 * URIs per call. Requires `playlist-modify-public` or `playlist-modify-private`
 * depending on the target playlist's visibility; both are on the `oauth2`
 * auth method.
 *
 * Not idempotent: a retry with no `position` appends the same tracks again
 * rather than being a no-op.
 */
const playlistAddTracks: ActionDefinition<Input> = {
  key: "playlist-add-tracks",
  type: "perform",
  resource: "playlist",
  title: "Add Tracks to Playlist",
  description: "Add up to 100 tracks to an existing playlist.",
  idempotent: false,
  params: [
    {
      key: "playlistId",
      label: "Playlist",
      type: "string",
      required: true,
      placeholder: "spotify:playlist:3cEYpjA9oz9GiPac4AsH4n",
      hint: "A Spotify playlist ID or URI.",
    },
    {
      key: "trackIds",
      label: "Track IDs",
      type: "string",
      required: true,
      hint: "Comma-separated Spotify track IDs or URIs. Maximum 100.",
    },
    {
      key: "position",
      label: "Insert position",
      type: "number",
      validation: { min: 0, integer: true },
      hint: "Zero-based index. Leave unset to append to the end.",
    },
  ],
  output: [{ key: "snapshot_id", type: "string", label: "Snapshot ID" }],

  execute(input, ctx) {
    const uris = (csv(input.trackIds) ?? []).map(toUri);
    return new SpotifyClient(ctx).request(`/playlists/${extractId(input.playlistId)}/tracks`, {
      method: "POST",
      body: { uris, position: input.position },
    });
  },
};

export default playlistAddTracks;
