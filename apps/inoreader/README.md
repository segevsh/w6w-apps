# Inoreader

Read and manage an Inoreader account from a workflow: subscriptions, folders and tags, unread
counts, article streams and item ids, read/starred state.

- **Categories** — productivity, cms
- **Auth methods** — oauth2 (authorization code)
- **Actions** — 15
- **Health checks** — 3 (`service` declared unavailable, `api`, `quota`) + the derived `auth:oauth2`
- **Egress allowlist** — `www.inoreader.com` (the OAuth endpoints are on the same host)
- **Website** — https://www.inoreader.com/
- **API docs** — https://www.inoreader.com/developers/
- **Status page** — https://status.inoreader.com/ (HTML only, see below)

> Verified on 2026-10-06 against every method page of the developer portal and live,
> unauthenticated probes of `www.inoreader.com` and `status.inoreader.com`. The authenticated
> response shapes are the vendor's documented ones; no live account was available to call them.

## Read this first

- **A paid plan is required.** The portal: "For all other use cases, an Inoreader Pro plan is
  required to access the API", and "Users on the Free plan will not be granted access to the
  developer API". Creating the developer application (Preferences > Developer > "Create new
  application") is gated the same way. Registration yields an App ID, App key (not used here),
  and the OAuth client id/secret.
- **Quotas are tiny and daily.** Default Pro limits: **100 requests/day in zone 1 (reads) and 100
  in zone 2 (writes)**, counted per application. A 429 means the zone you called is spent.
  Each response carries `X-Reader-Zone{1,2}-{Limit,Usage}` and `X-Reader-Limits-Reset-After`.
  Prefer `item-ids` over `stream-contents` when content is not needed — the vendor asks for it.
  The derived credential check and the `quota` check each spend one zone-1 request; `quota` polls at
  most every 6 hours for that reason.
- **No AppId/AppKey headers with OAuth.** The vendor states app authentication "is only needed
  when using ClientLogin"; the OAuth bearer token alone authenticates. An unsigned call answers
  `403 AppId required!`, which is how the `api` check proves the host is up.
- **Writes answer plain text.** Everything except `subscription-add` replies with the literal
  body `OK` (or `Error=<message>`), so success is judged from the body, not the HTTP status.

## Connecting

1. In Inoreader Preferences create an application. Set its redirect URI to your w6w host's OAuth
   callback; choose Read/Write if you want the write actions.
2. Put the client id and secret in the app's OAuth config on the w6w server (never in this package).
3. Connect: Inoreader's consent page grants `read write`. Access tokens are refreshed through the
   documented `refresh_token` grant at `/oauth2/token`.

PKCE is off: the documented authorization and token requests carry no challenge.

## Actions

| Action | Method and path | Zone |
|---|---|:-:|
| `user-info` | `GET /user-info` | 1 |
| `subscriptions-list` | `GET /subscription/list` (`team_assets`) | 1 |
| `subscription-add` | `POST /subscription/quickadd` | 2 |
| `subscription-edit` | `POST /subscription/edit` (`ac` edit / subscribe / unsubscribe) | 2 |
| `tags-list` | `GET /tag/list` (`types`, `counts`, `team_assets`) | 1 |
| `unread-counts` | `GET /unread-count` | 1 |
| `stream-contents` | `GET /stream/contents/{streamId}` | 1 |
| `item-ids` | `GET /stream/items/ids` | 1 |
| `stream-preferences-list` | `GET /preference/stream/list` | 1 |
| `stream-preferences-set` | `POST /preference/stream/set` | 2 |
| `tag-rename` | `POST /rename-tag` | 2 |
| `tag-delete` | `POST /disable-tag` | 2 |
| `item-tags-edit` | `POST /edit-tag` (add / remove any tag) | 2 |
| `items-mark-read` | `POST /edit-tag` with the read tag (convenience) | 2 |
| `mark-all-as-read` | `POST /mark-all-as-read` | 2 |

Base URL `https://www.inoreader.com/reader/api/0`. Zones are from the vendor's Rate limiting table.

### Things worth knowing

- **Parameters are sent on the query string**, also for POST — exactly as the vendor's examples
  show (`edit-tag?a=…&i=1&i=2`). The portal does not state whether a form body is accepted too, so
  this is the documented form. Because of it, article id lists are capped at **100 per call**
  (this app's own limit, not the vendor's) to keep URLs bounded.
- **`stream-contents` puts the stream id in the path** (URL-encoded, so `feed/http://…` becomes
  `feed%2Fhttp%3A%2F%2F…`); **`item-ids` takes it as the `s` query parameter**. Pages are limited to
  100 items (contents) and 1000 (ids); follow `continuation` until it is absent.
- **`subscription-add` reports `numResults: 0` as an error**; the vendor returns 1 even when the
  user already follows the feed, so the call is safe to repeat.
- **`tags-list` `counts` only works with `types`**; the action forces `types=1` when counts are on.
- **Marking an article unread can be silently ignored** when it is older than its feed's
  `firstitemmsec` — the vendor says so, and the `OK` reply does not tell you.
- **`mark-all-as-read` requires a timestamp** here, so an article that arrived after the caller last
  looked is never marked read unseen.
- Article ids come in a long form (`tag:google.com,2005:reader/item/00000000148b9369`) and a short
  decimal form (`344691561`). Both are accepted when editing tags; `item-ids` returns the short form.

## Health checks

| Check | What it does |
|---|---|
| `service` | Declared **unavailable**, `informational`. `status.inoreader.com` is a real page with an `API` component, but it has no feed or JSON: `/history.atom` and `/history.rss` return 500, the usual JSON paths 404, and **every `/api/*` path returns the same `400 {"status":"invalid-controller-or-action"}`** — a catch-all that looks like an API and is not. |
| `api` | Unsigned `GET /user-info`. The documented refusals — `403 AppId required!` or `401 OAuth token not found or invalid.` — are a **pass**; an HTML challenge page is `unknown`; 5xx is `down`. |
| `quota` | Signed `GET /user-info`; reads zone 1 and zone 2 usage and the reset time from the response headers. Informational; `degraded` at 10% left, `down` when a zone is spent. |
| `auth:oauth2` | Derived from the auth `test` hook: `GET /user-info`, passing only on a body with a `userId`. |

The credential probe reads `/user-info`, whose body is the user's id, name and email — never the token.

## Not implemented

Left out because the portal documents no page for them (the Rate limiting table lists several,
but listing a path is not documenting its parameters or response):
`/token`, `/save-user-pref`, `/preference/list`, `/mark-all-as-read-undo`, `/stream/items/contents`,
`/active_search/create` and `/active_search/delete`, and the Atom endpoint `/reader/atom`. The
legacy ClientLogin sign-in is also omitted: the vendor tells new apps to use OAuth.

## Development

```bash
deno task fmt && deno task validate && deno task check && deno task lint && deno task test
```
