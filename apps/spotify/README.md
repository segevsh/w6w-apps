# Spotify

Search Spotify's catalog and manage playlists, profile and playback state via the
[Web API](https://developer.spotify.com/documentation/web-api).

- **Categories** — productivity
- **Auth methods** — oauth2 (Authorization Code + PKCE)
- **Actions** — 9
- **Egress allowlist** — `api.spotify.com`, `accounts.spotify.com`
- **Website** — https://www.spotify.com
- **API docs** — https://developer.spotify.com/documentation/web-api

## Auth

OAuth 2.0 Authorization Code flow with PKCE
(`https://accounts.spotify.com/authorize` /
`https://accounts.spotify.com/api/token`). `client_id` / `client_secret` /
`redirect_uri` are configured on the w6w server, not in this package. Access
tokens expire in 1 hour; refresh is the standard `grant_type=refresh_token`
request against the same token endpoint, driven generically by the host from
the declared `refreshUrl` — no bespoke `refresh` hook.

Scopes requested are the minimum each shipped action needs:

| Scope | Used by |
|---|---|
| `user-read-private` | `user-get-profile` (subscription tier) |
| `user-read-email` | `user-get-profile` (email address) |
| `playlist-read-private` | `playlist-get-user-playlists` (include private playlists) |
| `playlist-modify-public` | `playlist-create`, `playlist-add-tracks` (public playlists) |
| `playlist-modify-private` | `playlist-create`, `playlist-add-tracks` (private playlists) |
| `user-read-currently-playing` | `player-get-currently-playing` |

`search`, `track-get`, `album-get` and `artist-get` need no scope — catalog
reads work with any valid user token.

## Actions

| Key | Type | Endpoint |
|---|---|---|
| `search` | search | `GET /search` |
| `track-get` | read | `GET /tracks/{id}` |
| `album-get` | read | `GET /albums/{id}` |
| `artist-get` | read | `GET /artists/{id}` |
| `user-get-profile` | read | `GET /me` |
| `playlist-get-user-playlists` | read | `GET /me/playlists` |
| `playlist-create` | perform | `POST /me/playlists` |
| `playlist-add-tracks` | perform | `POST /playlists/{playlist_id}/tracks` |
| `player-get-currently-playing` | read | `GET /me/player/currently-playing` |

`playlist-create` uses the current `POST /me/playlists` endpoint — the older
`POST /users/{user_id}/playlists` form was removed per Spotify's [February
2026 Web API changelog](https://developer.spotify.com/documentation/web-api/references/changes/february-2026).

Every ID/URI param (`track-get.id`, `album-get.id`, `artist-get.id`,
`playlist-add-tracks.playlistId`, and the track IDs it takes) accepts either
a bare Spotify ID or a `spotify:<type>:<id>` URI — `lib/client.ts`'s
`extractId` strips the prefix when present.

`player-get-currently-playing` normalizes Spotify's documented `204 No
Content` (nothing playing, or a private session) to `{ is_playing: false }`
rather than surfacing an empty body to the caller.

### Deliberately out of scope

- **Playback control** (play/pause/skip/queue/volume). Every one of those
  endpoints needs an active Spotify Connect device and the
  `user-modify-playback-state` scope, and most fail with a 404 the moment
  nothing is playing anywhere — a poor fit for an unattended workflow step.
  A natural follow-up once there's a concrete need.
- **Library and following** (liked tracks, followed artists). Real
  endpoints, just not part of this initial action set.
- **Audio features / audio analysis.** Deprecated for new apps as of
  Spotify's November 2024 API changes; omitted rather than shipping a dead
  endpoint.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Service status** — <https://spotify.statuspage.io>

```
GET https://spotify.statuspage.io/api/v2/summary.json
```

Atlassian Statuspage, confirmed live 2026-08-01 (`status`, `components`,
`incidents`, `scheduled_maintenances` — same shape as GitHub's and Box's
status pages). `summary.json` adds the per-component breakdown that
`status.json` doesn't carry. Spotify also runs a narrower
[status.spotify.dev](https://status.spotify.dev) for Web API incidents
specifically; `spotify.statuspage.io` is used here because it's the one
confirmed to expose the machine-readable Statuspage contract this check
depends on.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

```
GET /me
```

The authenticated user's profile. Works for any valid OAuth token, regardless of
scope.

### Do we have quota left?

**Not verifiable, and declared as such rather than guessed.** Spotify's [rate
limits documentation](https://developer.spotify.com/documentation/web-api/concepts/rate-limits)
states only that a `429` response "will normally include a `Retry-After`
header" — no `X-RateLimit-Remaining`-style counter on any response, and no
dedicated quota endpoint. `health/quota.ts` declares `unavailable` with that
reason rather than fabricating a probe.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | — | informational | — | declared `unavailable` (no probe exists) |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `spotify.statuspage.io` (for `service`) is reachable **only inside that hook's
worker** — not from any action, and not from the other checks. The spec allows the
widening precisely because the check is unsigned; pairing an extra host with
`credential: "signed"` is rejected at load time, so a credential can never reach a status
host.

---

Researched and endpoint-verified 2026-08-01 against
developer.spotify.com. Status surfaces move; re-check if a probe starts
failing for everyone at once.
