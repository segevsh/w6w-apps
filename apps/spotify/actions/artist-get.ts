import type { ActionDefinition } from "@w6w/types";
import { extractId, SpotifyClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/**
 * Get catalog information for a single artist.
 * https://developer.spotify.com/documentation/web-api/reference/get-an-artist
 * (checked 2026-08-01). No scope required, and no `market` filter — the
 * endpoint takes none.
 */
const artistGet: ActionDefinition<Input> = {
  key: "artist-get",
  type: "read",
  resource: "artist",
  title: "Get Artist",
  description: "Get catalog information for an artist by their ID or URI.",
  params: [idParam("Artist", "spotify:artist:0TnOYISbd1XYRBk9myaseg")],
  output: [
    { key: "id", type: "string", label: "Artist ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "genres", type: "array", label: "Genres" },
    { key: "popularity", type: "number", label: "Popularity" },
    { key: "followers", type: "object", label: "Followers" },
    { key: "images", type: "array", label: "Images" },
    { key: "external_urls", type: "object", label: "External URLs" },
  ],

  execute(input, ctx) {
    return new SpotifyClient(ctx).request(`/artists/${extractId(input.id)}`);
  },
};

export default artistGet;
