import type { ActionDefinition } from "@w6w/types";
import { SpotifyClient } from "../lib/client.ts";
import { market } from "../lib/params.ts";

interface Input {
  market?: string;
}

interface CurrentlyPlaying {
  is_playing: boolean;
  progress_ms?: number;
  item?: unknown;
  currently_playing_type?: string;
}

/**
 * Get the track or episode currently playing on the user's account.
 * https://developer.spotify.com/documentation/web-api/reference/get-the-users-currently-playing-track
 * (checked 2026-08-01). Requires `user-read-currently-playing`.
 *
 * Spotify returns `204 No Content` with an empty body when nothing is
 * playing or the user has a private session enabled — well-documented
 * behavior (spotify/web-api#708, #662), not a bespoke guess. `SpotifyClient`
 * turns that into `undefined`, which this action normalizes to
 * `{ is_playing: false }` rather than surfacing `undefined` to the caller.
 */
const playerGetCurrentlyPlaying: ActionDefinition<Input> = {
  key: "player-get-currently-playing",
  type: "read",
  resource: "player",
  title: "Get Currently Playing",
  description: "Get the track currently playing on the connected account, if any.",
  params: [market],
  output: [
    { key: "is_playing", type: "boolean", label: "Is playing" },
    { key: "progress_ms", type: "number", label: "Progress (ms)" },
    { key: "item", type: "object", label: "Track" },
    { key: "currently_playing_type", type: "string", label: "Item type" },
  ],

  async execute(input, ctx) {
    const result = await new SpotifyClient(ctx).request<CurrentlyPlaying | undefined>(
      "/me/player/currently-playing",
      { query: { market: input.market } },
    );
    return result ?? { is_playing: false };
  },
};

export default playerGetCurrentlyPlaying;
