# WakaTime

Read coding-time stats, daily summaries, durations, heartbeats, projects, commits, goals and
private leaderboards from **WakaTime**, and send heartbeats and external durations, over the
**WakaTime API v1**.

- **Categories** — developer-tools, analytics
- **Auth methods** — api-key (the account's secret API key, HTTP Basic)
- **Actions** — 25
- **Health checks** — `service` (declared unavailable, informational), `api` (unsigned
  `GET /users/current`, a schema-correct 401 `errors` envelope passes), `quota` (declared
  unavailable, informational) + the derived `auth:api-key`
- **Egress allowlist** — `api.wakatime.com`
- **Icon** — `assets/icon.svg` is the vendor mark byte-for-byte from
  `https://cdn.simpleicons.org/wakatime` (md5 `33f4e584a0f1fca6829fc1909254763d`).
  `assets/icon.dark.svg` is the sanctioned white variant (`_tools/icon-legibility.ts fix wakatime`)
  because the black mark is illegible on the dark tile.

## Connecting

1. In WakaTime open **Settings > Account > API Key** (`wakatime.com/settings/api-key`).
2. Copy the secret key (starts with `waka_`) into the connection's **Secret API key** field.

The key is sent as `Authorization: Basic base64(<key>)`, exactly as the reference describes
("Using API Key"). The `?api_key=` query form is not used because URLs land in logs. Do not paste
the key anywhere public: the reference warns to use embeddable charts for that.

## Things most likely to go wrong

- **Host.** The reference's prefix is `https://api.wakatime.com/api/v1/`; its own Python sample
  uses `wakatime.com/api/v1`. Only `api.wakatime.com` is declared and called.
- **A wrong key looks like a missing key.** Missing, malformed and wrong keys all answer HTTP 401
  `{"errors": ["Unauthorized."]}`. The credential test and the unsigned `api` health probe read
  the body (`data.id` vs the `errors` array), not just the status.
- **202 means "still computing".** Stats, summaries and insights can answer 202 with
  `is_up_to_date: false` and partial data; read again later. Several reads (goal, status bar) are
  cache-backed and return an empty object while the cache fills.
- **Rate limit** is "fewer than 10 requests per second on average over any 5 minute period". A
  breach is a 429, or sometimes a 302 that times out. No rate-limit headers are documented, so
  `quota` is a declared absence.
- **Free plan.** The reference notes long ranges refresh less often on the free plan; the
  all-time total is available on every plan.
- **External durations** are documented as created by OAuth apps; an API key may be refused.
  `external-duration-create` follows the reference's body but is unverified with a live key.
- **Status page.** `status.wakatime.com` is real (title "Status - WakaTime") but HTML-only: every
  feed path is 404, so `service` is declared unavailable.
- **Decision (unattended build).** OAuth 2.0 exists but needs a registered client and a per-user
  consent flow, so only the API-key method is built.

## Actions

| Key | Title | Request (under `https://api.wakatime.com/api/v1`) |
|---|---|---|
| `all-time-get` | Get All-Time Total | `GET /users/current/all_time_since_today` |
| `commit-get` | Get Commit | `GET /users/current/projects/{project}/commits/{hash}` |
| `commit-list` | List Commits | `GET /users/current/projects/{project}/commits` |
| `dashboard-list` | List Org Dashboards | `GET /users/current/orgs/{orgId}/dashboards` |
| `data-dump-create` | Create Data Export | `POST /users/current/data_dumps` |
| `data-dump-list` | List Data Exports | `GET /users/current/data_dumps` |
| `durations-list` | List Durations | `GET /users/current/durations` |
| `external-duration-create` | Create External Duration | `POST /users/current/external_durations` |
| `external-durations-bulk-delete` | Delete External Durations (Bulk) | `DELETE /users/current/external_durations.bulk` |
| `external-durations-list` | List External Durations | `GET /users/current/external_durations` |
| `goal-get` | Get Goal | `GET /users/current/goals/{goalId}` |
| `goal-list` | List Goals | `GET /users/current/goals` |
| `heartbeat-create` | Create Heartbeat | `POST /users/current/heartbeats` |
| `heartbeats-bulk-create` | Create Heartbeats (Bulk) | `POST /users/current/heartbeats.bulk` |
| `heartbeats-bulk-delete` | Delete Heartbeats (Bulk) | `DELETE /users/current/heartbeats.bulk` |
| `heartbeats-list` | List Heartbeats | `GET /users/current/heartbeats` |
| `insight-get` | Get Insight | `GET /users/current/insights/{insightType}/{range}` |
| `leaderboard-get` | Get Private Leaderboard | `GET /users/current/leaderboards/{boardId}` |
| `leaderboard-list` | List Private Leaderboards | `GET /users/current/leaderboards` |
| `org-list` | List Organizations | `GET /users/current/orgs` |
| `project-list` | List Projects | `GET /users/current/projects` |
| `stats-get` | Get Stats | `GET /users/current/stats[/{range}]` |
| `status-bar-get` | Get Today's Status Bar | `GET /users/current/status_bar/today` |
| `summaries-get` | Get Summaries | `GET /users/current/summaries` |
| `user-get` | Get Current User | `GET USER` |

All per-user routes use `/users/current`, i.e. the account that owns the key.

## Not covered

- **OAuth 2.0** (`wakatime.com/oauth/authorize|token|revoke`) — a future second auth method.
- Other users' data (`/users/:user/...`), org dashboard durations, summaries and member
  routes, the public leaders list, editors, program languages, machine names, user agents, custom
  rules, org custom rules, and private-leaderboard writes. Documented, but outside the core
  read/write set this app ships.
- The credential-free `/meta` and `/editors` lists.
