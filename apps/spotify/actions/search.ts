import type { ActionDefinition } from "@w6w/types";
import { SpotifyClient } from "../lib/client.ts";
import { market } from "../lib/params.ts";

interface Input {
  query: string;
  types: string[];
  market?: string;
  limit?: number;
  offset?: number;
}

/**
 * Search the catalog for tracks, albums, artists and/or playlists in one
 * call. https://developer.spotify.com/documentation/web-api/reference/search
 * (checked 2026-08-01).
 *
 * `limit` is per item type, not a total — searching two types with
 * `limit: 10` can return up to 20 items combined. Spotify's own default (5)
 * and range (0-10) are kept rather than widened, since the API rejects
 * anything above 10.
 */
const search: ActionDefinition<Input> = {
  key: "search",
  type: "search",
  resource: "search",
  title: "Search",
  description: "Search Spotify's catalog for tracks, albums, artists and playlists.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      hint:
        "Free text, or field filters like `artist:name`, `year:2020`, `genre:jazz`, `isrc:...`.",
    },
    {
      key: "types",
      label: "Item types",
      type: "multiselect",
      required: true,
      default: ["track"],
      options: [
        { value: "track", label: "Track" },
        { value: "album", label: "Album" },
        { value: "artist", label: "Artist" },
        { value: "playlist", label: "Playlist" },
      ],
    },
    market,
    {
      key: "limit",
      label: "Limit per type",
      type: "number",
      default: 5,
      validation: { min: 0, max: 10, integer: true },
      hint: "Spotify caps this at 10 results per item type.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      validation: { min: 0, max: 1000, integer: true },
    },
  ],
  output: [
    { key: "tracks", type: "object", label: "Tracks" },
    { key: "albums", type: "object", label: "Albums" },
    { key: "artists", type: "object", label: "Artists" },
    { key: "playlists", type: "object", label: "Playlists" },
  ],

  execute(input, ctx) {
    return new SpotifyClient(ctx).request("/search", {
      query: {
        q: input.query,
        type: input.types.join(","),
        market: input.market,
        limit: input.limit ?? 5,
        offset: input.offset ?? 0,
      },
    });
  },
};

export default search;
