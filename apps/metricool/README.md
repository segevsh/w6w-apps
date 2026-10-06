# Metricool

Manage Metricool brands, schedule and edit social posts, and read analytics and competitor data
through the Metricool REST API (`https://app.metricool.com/api`, OpenAPI at
`/api/swagger.json`). 18 actions.

## Connection

One auth method, `user-token`: your **user token** (Metricool > Account settings > API) and your
numeric **user id**. `sign` sends the token as `X-Mc-Auth` and sets `userId` as a query parameter.
The brand (`blogId`) is an **action parameter** on every brand-scoped action: run **List Brands**
and use a brand's `id`.

## Actions

| Group | Actions |
|---|---|
| Brands | `brand-list`, `brand-get` |
| Scheduled posts | `post-list`, `post-get`, `post-create`, `post-update` (PUT, replaces), `post-reschedule` (PATCH `fields=publicationDate`), `post-delete` |
| Analytics | `analytics-timeline`, `analytics-aggregation`, `analytics-distribution`, `brand-summary-posts-list`, `hashtag-search` |
| Competitors | `competitor-list`, `competitor-add`, `competitor-remove`, `competitor-timeline`, `competitor-aggregation` |

`post-create` / `post-update` take `providers` (e.g. `[{"network":"instagram"}]`) and an optional
`networkData` object merged into the post for the vendor's per-network blocks (`instagramData`,
`youtubeData`, `tiktokData`, ...).

## Health checks

- `service`: declared unavailable, informational. Metricool publishes no status page:
  `status.metricool.com` does not resolve, `metricool.statuspage.io` answers "Your page is
  inactive", `metricool.betteruptime.com` redirects to Better Stack's marketing page.
- `api`: unsigned `GET /v2/health` (the vendor's documented liveness check). Passes only on the
  `{"status":"UP"}` body; an HTML or other 200 is `unknown`.
- `quota`: declared unavailable, informational. No rate limit or header is documented.
- `auth:user-token` (derived): signed `GET /v2/settings/brands` (brand names and ids, never the
  token). Passes on the `{data: [...]}` envelope; a rejection is read from the vendor's
  `{"status":"UNAUTHORIZED",...}` body.

## Notes and limits

- **The gateway answers 401 for any path**, including nonexistent ones, so an unsigned 401 never
  proves a route exists. Paths and shapes here come from the OpenAPI document; none could be
  exercised with a live credential. In particular, whether `blogId` is ignored on the brand
  endpoints is unconfirmed, so `brand-list` and `brand-get` do not send it.
- Every v2 response is `{metadata, page, data}`; actions return `data`.
- Deprecated operations (46) are not used.

## Not covered (of 559 paths)

Deleted-post list/restore (`orderDirection` values are not documented), library posts, post
approvals and notes, per-network `/stats/*` post lists (Facebook, Instagram reels/stories,
LinkedIn), reviews and comments, boosts, Instagram bio-link catalog, smart links, Linkin.bio, flows,
reports, performance dashboards, studio, AI endpoints, inbox/conversations, brand and user
settings writes, team members/roles, agency and white-label admin, API usage stats (`aggregation`
values undocumented), ads campaigns, and webhooks.
