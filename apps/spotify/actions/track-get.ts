import type { ActionDefinition } from "@w6w/types";
import { extractId, SpotifyClient } from "../lib/client.ts";
import { idParam, market } from "../lib/params.ts";

interface Input {
  id: string;
  market?: string;
}

/**
 * Get catalog information for a single track.
 * https://developer.spotify.com/documentation/web-api/reference/get-track
 * (checked 2026-08-01). No scope required.
 */
const trackGet: ActionDefinition<Input> = {
  key: "track-get",
  type: "read",
  resource: "track",
  title: "Get Track",
  description: "Get catalog information for a track by its ID or URI.",
  params: [idParam("Track", "spotify:track:11dFghVXANMlKmJXsNCbNl"), market],
  output: [
    { key: "id", type: "string", label: "Track ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "duration_ms", type: "number", label: "Duration (ms)" },
    { key: "explicit", type: "boolean", label: "Explicit" },
    { key: "popularity", type: "number", label: "Popularity" },
    { key: "artists", type: "array", label: "Artists" },
    { key: "album", type: "object", label: "Album" },
    { key: "external_urls", type: "object", label: "External URLs" },
  ],

  execute(input, ctx) {
    return new SpotifyClient(ctx).request(`/tracks/${extractId(input.id)}`, {
      query: { market: input.market },
    });
  },
};

export default trackGet;
