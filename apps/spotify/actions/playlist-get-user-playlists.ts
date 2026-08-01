import type { ActionDefinition } from "@w6w/types";
import { SpotifyClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
}

/**
 * Get a list of the playlists owned or followed by the current user.
 * https://developer.spotify.com/documentation/web-api/reference/get-a-list-of-current-users-playlists
 * (checked 2026-08-01). Requires `playlist-read-private` to include private
 * playlists — without it only public ones come back.
 */
const playlistGetUserPlaylists: ActionDefinition<Input> = {
  key: "playlist-get-user-playlists",
  type: "read",
  resource: "playlist",
  title: "Get User's Playlists",
  description: "List the current user's playlists.",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 20,
      validation: { min: 1, max: 50, integer: true },
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      validation: { min: 0, max: 100000, integer: true },
    },
  ],
  output: [
    { key: "items", type: "array", label: "Playlists" },
    { key: "total", type: "number", label: "Total" },
    { key: "next", type: "string", label: "Next page URL" },
  ],

  execute(input, ctx) {
    return new SpotifyClient(ctx).request("/me/playlists", {
      query: { limit: input.limit ?? 20, offset: input.offset ?? 0 },
    });
  },
};

export default playlistGetUserPlaylists;
