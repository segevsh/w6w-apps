# Iterable

Iterable is a cross-channel marketing platform. This app exposes its server-side REST API: users,
events, lists, campaigns and journeys, templates, catalogs, channels and message types,
email/SMS/push sends, and subscriptions. **54 actions.** Everything was verified on 2026-10-06
against Iterable's Swagger 2.0 document (`https://api.iterable.com/api-docs`, v1.8, 138 paths), and
the auth, status and host behaviour against the live service.

## Auth

`Api-Key: <key>` header (`securityDefinitions.api_key`), applied only in the Auth `sign` hook.
Create a **Server-side** key in Iterable > Integrations > API Keys. Mobile and JavaScript keys are
not meant for these endpoints.

The connection also carries a **Data center** field, `us` (`api.iterable.com`) or `eu`
(`api.eu.iterable.com`). A project and its keys live in exactly one; the wrong host answers
`401 {"code":"Unauthorized","msg":"Invalid API key"}`. `afterConnect` echoes the region onto the
connection so actions pick the host without seeing the credential. `network.allow` is exactly those
two hosts.

### Credential probe

`GET /api/channels` — Iterable has no whoami. It needs a key (unsigned: `401 "No API key found on
request"`, fake key: `401 "Invalid API key"`, both measured live on both hosts), it returns project
metadata only (`{channels: [...]}`, so nothing echoes the key), it writes nothing, and a server-side
key can always read it. The verdict comes from the body: success needs the documented `channels`
array; rejection is the vendor's own `code` (`Unauthorized`/`BadApiKey`), whatever the HTTP status.

## Health checks

| Check | Posture | Decision |
|---|---|---|
| `auth:api-key` (derived) | signed | the probe above |
| `service` | unsigned, `network.allow: status.iterable.com` | Atlassian Statuspage `summary.json`; real page (`page.name = "Iterable"`, id `hm1wdv9pcjp9`, 200, no redirect) |
| `quota` | declared absence, `informational` | rate limits are documented per endpoint but no headroom header or endpoint exists (response headers measured: no `X-RateLimit-*`) |

The status page has **556 components**: one group per customer cluster (Cluster 5..150, `EU - C1`,
`EU - C2`) plus 11 ungrouped `Global ...` components (Global API Ingestion, Global API Success, ...).
The page-wide `status.indicator` goes non-`none` on any single cluster's incident, and a connection
does not know its cluster, so the check judges only the global components. Cluster incidents are
not attributed to a connection.

## Actions

- **Users** — get by email / userId, update, bulk update, change email, merge, delete by email /
  userId, list user fields, get sent messages
- **Events** — track, track in bulk, get user events (by email / userId), track purchase, update cart
- **Lists** — list, create, delete, get members, get size, subscribe, unsubscribe
- **Campaigns & journeys** — list/get campaigns, metrics, trigger to lists, send now, abort; list
  journeys, trigger journey
- **Templates** — list; get email / SMS / push template
- **Catalogs** — list, create, delete; list/get/replace/update/delete item; bulk upsert items
- **Channels** — list channels, list message types
- **Sends** — send email / SMS / push (triggered campaign to one user), cancel scheduled email /
  SMS / push
- **Subscriptions** — update a user's subscriptions, bulk update

## Behaviour notes and decisions

- **HTTP status is a hint.** Iterable error bodies are `{msg, code, params}`; `code` is an enum
  with `Success` the only good value. The client treats a 2xx whose body carries any other code as a
  failure, and error messages are `Iterable <status> ... <code>: <msg>`.
- **Two endpoints answer `text/plain`**, not JSON: list members (`/lists/getUsers`, one per line)
  and campaign metrics (CSV). They return `{users, text}` and `{csv}`. List size is also text and is
  returned as `{size, text}` (`size` is `null` if the body is not numeric). The member and size reads
  are limited to 5 requests/minute per project.
- **Pagination.** `list-campaigns`, `list-templates` and `list-journeys` take `page`/`pageSize`
  (campaigns/templates default 20, max 1000; journeys max 50; catalogs default 10) and return
  Iterable's `nextPageUrl`. The unpaginated form of campaigns/templates is deprecated by the vendor
  ("may be removed in the future"), so the actions document passing pagination. Fields the vendor
  marks deprecated (`failedUpdates` replaces several list fields; `dataFeedId` -> `dataFeedIds`) are
  not modelled.
- **Array query parameters** (`campaignIds`, `campaignId`, states) use Swagger `collectionFormat:
  multi`: the key repeats per value.
- **Idempotency.** `track-event` is `idempotent: false`, but Iterable dedupes on its optional `id`
  field; supply one if the call may be retried. Sends, purchases, merges and trigger actions are
  non-idempotent. Catalog item writes are asynchronous (202).
- **`update-user-subscriptions` overwrites** each list field you supply; it does not merge.
- **Delete-user** is asynchronous and does not stop future data collection about the user.
- **Identifiers.** Iterable wants `email` or `userId` (not both) per project mode; the actions
  enforce "exactly one" or "at least one" as the endpoint documents.
- Not-found on a user read: the vendor schema shows an optional `user`; the app returns
  `user: null` when absent rather than guessing a status.

## Not covered

Left out so the app only does what was verified: JWT invalidation, embedded messaging, in-app
messages, web push, RCS, WhatsApp and SMS verification sends and their cancels; experiments;
data export jobs and CSV exports; metadata tables; snippets; webhooks admin; template create/update/
preview/proof for every channel; campaign create/schedule/archive/cancel/activate; catalog field
mappings and bulk delete; GDPR forget/unforget and forgotten-user exports; device/browser token
registration; the `subscriptions/{group}/{id}/...` single-user endpoints (the vendor requires a
customer success manager to enable them); `merge-users` `arrayMerge`; list user preview.

## Icon

`assets/icon.svg` embeds, verbatim, Iterable's own 180x180 PNG
(`apple-touch-icon.png` from iterable.com, 6895 bytes). No vendor SVG was found:
`iterable.com/favicon.svg` and the theme's favicon path 404, and simple-icons and n8n have no
Iterable glyph. The mark is dark-on-light; there is no dark-mode variant.

## Tests

`deno task test` — every action has tests for its wire shape (method, URL, body, query), the EU
host, a missing required input, and both error paths (non-2xx and 200 with a non-`Success` code),
plus the entry module, auth, client and both health checks.
