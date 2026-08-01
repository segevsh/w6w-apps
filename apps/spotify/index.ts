/**
 * Spotify — search the catalog and manage playlists, profile and playback
 * state via the Web API (https://developer.spotify.com/documentation/web-api,
 * checked 2026-08-01).
 *
 * Deliberately out of scope for this first cut:
 *
 *   - **Playback control** (play/pause/skip/queue/volume). Every one of
 *     those endpoints needs an active Spotify Connect device and the
 *     `user-modify-playback-state` scope, and most fail with a 404 the
 *     moment nothing is playing anywhere — a poor fit for an unattended
 *     workflow step. `player-get-currently-playing` (read-only) ships;
 *     control actions are a natural follow-up once there's a concrete need.
 *   - **Library and following** (liked tracks, followed artists). Real
 *     endpoints, just not part of this pack's initial action set — add them
 *     as `library-*` / `user-*` actions against `user-library-read` /
 *     `user-follow-read` when asked.
 *   - **Audio features / audio analysis.** Deprecated for new apps as of
 *     Spotify's November 2024 API changes; omitted rather than shipping a
 *     dead endpoint.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import search from "./actions/search.ts";
import trackGet from "./actions/track-get.ts";
import albumGet from "./actions/album-get.ts";
import artistGet from "./actions/artist-get.ts";
import userGetProfile from "./actions/user-get-profile.ts";
import playlistGetUserPlaylists from "./actions/playlist-get-user-playlists.ts";
import playlistCreate from "./actions/playlist-create.ts";
import playlistAddTracks from "./actions/playlist-add-tracks.ts";
import playerGetCurrentlyPlaying from "./actions/player-get-currently-playing.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // catalog
    search,
    trackGet,
    albumGet,
    artistGet,
    // user
    userGetProfile,
    // playlist
    playlistGetUserPlaylists,
    playlistCreate,
    playlistAddTracks,
    // player
    playerGetCurrentlyPlaying,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
