import type { ActionDefinition } from "@w6w/types";
import { extractId, SpotifyClient } from "../lib/client.ts";
import { idParam, market } from "../lib/params.ts";

interface Input {
  id: string;
  market?: string;
}

/**
 * Get catalog information for a single album.
 * https://developer.spotify.com/documentation/web-api/reference/get-an-album
 * (checked 2026-08-01). No scope required.
 */
const albumGet: ActionDefinition<Input> = {
  key: "album-get",
  type: "read",
  resource: "album",
  title: "Get Album",
  description: "Get catalog information for an album by its ID or URI.",
  params: [idParam("Album", "spotify:album:4aawyAB9vmqN3uQ7FjRGTy"), market],
  output: [
    { key: "id", type: "string", label: "Album ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "album_type", type: "string", label: "Album type" },
    { key: "release_date", type: "string", label: "Release date" },
    { key: "total_tracks", type: "number", label: "Total tracks" },
    { key: "artists", type: "array", label: "Artists" },
    { key: "images", type: "array", label: "Images" },
    { key: "external_urls", type: "object", label: "External URLs" },
  ],

  execute(input, ctx) {
    return new SpotifyClient(ctx).request(`/albums/${extractId(input.id)}`, {
      query: { market: input.market },
    });
  },
};

export default albumGet;
