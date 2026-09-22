# GIPHY

Search GIPHY's GIF and sticker library, fetch what is trending, pull a random pick, translate a
phrase into the single best GIF, and look up GIFs by id — on the **GIPHY API** (`api.giphy.com`).

- **Categories** — social-media, search
- **Auth methods** — api-key
- **Actions** — 12
- **Health checks** — 1 (`service`) + the derived `auth:api-key`
- **Egress allowlist** — `api.giphy.com` (the `service` check adds `status.giphy.com` to its own hook
  allowlist, never to the app's)
- **Website** — https://giphy.com/
- **API docs** — https://developers.giphy.com/docs/api/
- **Endpoint reference** — https://developers.giphy.com/docs/api/endpoint/
- **Object schema** — https://developers.giphy.com/docs/api/schema/
- **Response codes** — https://developers.giphy.com/docs/api/#response-codes
- **Status page** — https://status.giphy.com/

> **Everything below was verified against GIPHY's own sources on 2026-09-22** — the `developers.giphy.com`
> API, endpoint, schema and response-code pages — plus live probes against `api.giphy.com` and
> `status.giphy.com`. Nothing here came from a third-party integration directory, a marketing page, or
> a sibling app.

## The shape of the API

One host, one version prefix, one verb:

- every documented endpoint is `https://api.giphy.com/v1/...`
- every endpoint in this app's surface is a `GET`
- every endpoint requires the credential, and **only** as a query-string parameter, `api_key`

Every response is the same envelope:

```jsonc
{
  "data": [ /* or a single object on the random/translate endpoints */ ],
  "meta": { "status": 200, "msg": "OK", "response_id": "…" },
  "pagination": { /* list endpoints only */ }
}
```

GIPHY documents these response codes — as **`meta.status`**, which is the vendor's own copy of the
code:

| Code | Meaning                                                    |
| ---- | ---------------------------------------------------------- |
| 200  | OK                                                         |
| 400  | Bad Request — malformed or missing required parameter       |
| 401  | Unauthorized — missing or bad API key                      |
| 403  | Forbidden — not authorized                                 |
| 404  | Not Found — that GIF/sticker id does not exist              |
| 414  | URI Too Long — search query over 50 characters              |
| 429  | Too Many Requests — rate limited                           |

## The five things most likely to go wrong

### 1. The key goes in the query string, because GIPHY has no header form

Every endpoint documents `api_key : string(required)` as a **query-string parameter**; none documents
an `Authorization` header or any other way to present the key. So
[`auth/api-key.ts`](auth/api-key.ts) declares `apiKey: { in: "query", name: "api_key" }`, and its
`sign` hook is the only place a request ever learns the key.

`sign` parses `request.url` with `URL` and sets the parameter through `URLSearchParams`. Appending
`"?api_key=…"` by hand would be wrong on almost every action in this app: they already send `q`,
`limit`, `offset`, `rating`, `s` or `ids`, so a literal `?` would produce a malformed URL, and a
second `api_key` would be a silent no-op rather than an error. Setting through `searchParams` merges
with what the action built and overwrites rather than repeats.

The consequence is worth stating plainly: **the key is in the URL**, and a workflow host logs request
URLs. That is GIPHY's design, not a choice this app made — and it is why the actions never touch the
credential and why error messages name the HTTP method and the *path* only, never the full URL.

### 2. GIPHY's real status is in the body

GIPHY always sends its own code in `meta.status` and its own message in `meta.msg`. An invalid key
was probed live and answered:

```
HTTP/1.1 401 Unauthorized
{"data": [], "meta": {"status": 401, "msg": "Unauthorized", "response_id": ""}}
```

The two agree there, but the body is the field the vendor documents as authoritative. So:

- [`lib/client.ts`](lib/client.ts) classifies on `metaStatusOf(body, res.status)` — the body first,
  the HTTP status only as a fallback for a response with no readable `meta` at all.
- the auth probe classifies success as `meta.status === 200` and reports `meta.msg` on failure,
  never `Response.ok`.

### 3. Two response shapes, not one

List endpoints put an **array** in `data`; the `random` and `translate` endpoints put a **single
`GifObject`** there. The actions declare which they return — `data` is `type: "array"` with
`data[].…` output fields on the lists, and `type: "object"` with `data.…` fields on the four
single-object endpoints — rather than pretending the surface is uniform.

### 4. One 4xx is an answer, not a failure

`GET /v1/gifs/{gif_id}` answers a `4xx` `meta.status` with an **empty `data`** when the id does not
exist. That is information: the lookup ran and the id is unknown. So `get-gif-by-id` accepts a 404
and returns GIPHY's `data` **and** `meta`, which is how a caller tells "no such id" from "here it is"
— while every other non-200 code still throws. Every other action throws on any non-200, because
there a non-200 really is a failure of the request.

### 5. Everything is a beta key until GIPHY says otherwise

GIPHY documents that all keys start as **beta keys, capped at 100 API calls/hour**; production keys
lift that. A live `curl -sI` against a real endpoint on 2026-09-22 found **no `x-ratelimit-*` header
or any other quota header**, so this app declares **no `quota` health check** — there is nothing on
the wire to read. The ceiling is stated in the auth field's hint and in the 429 error hint instead,
where a reader will actually see it.

## Auth

| Method   | Type     | Credential | Wire form              |
| -------- | -------- | ---------- | ---------------------- |
| `api-key`| `apiKey` | one secret | `?api_key=…`, merged into each request by `sign` |

The credential-liveness probe is **`GET /v1/gifs/trending?limit=1`**
([`PROBE_PATH`](auth/api-key.ts)):

- it is the cheapest call on the surface — the whole `/gifs/trending` family needs **no other
  parameter at all**, and `limit=1` asks for the smallest response GIPHY will send;
- it proves exactly what every action needs proved (GIPHY accepts this key and answers
  `meta.status 200`);
- it returns no account data. GIPHY documents **no account or "who am I" endpoint** for an
  `api_key`, so there is no identity to publish and this app declares no `afterConnect`.

The probe is built by [`probeRequest()`](auth/api-key.ts) and signed by this method's **own `sign`
hook**, so the probe cannot drift from what a workflow step sends — a hand-rolled second copy of
either half is how a probe ends up testing something the real requests never do. (A test asserts the
probe's URL carries `api_key`.)

The failure messages name GIPHY's code and message and never the key material: a 401 is reported as
"GIPHY rejected the API key", a 429 as rate limiting, and a 200-with-a-401-body as a rejected key.

## Actions

| Action                  | Type   | Method + path               | Required | Optional (as exposed here)         | `data`    |
| ----------------------- | ------ | --------------------------- | -------- | ---------------------------------- | --------- |
| `search-gifs`           | search | `GET /v1/gifs/search`       | `q`      | `limit` (25), `offset`, `rating`, `lang` | array |
| `search-stickers`       | search | `GET /v1/stickers/search`   | `q`      | `limit` (25), `offset`, `rating`   | array     |
| `get-trending-gifs`     | read   | `GET /v1/gifs/trending`     | —        | `limit`, `offset`, `rating`        | array     |
| `get-trending-stickers` | read   | `GET /v1/stickers/trending` | —        | `limit`, `offset`, `rating`        | array     |
| `get-random-gif`        | read   | `GET /v1/gifs/random`       | —        | `tag`, `rating`                    | **object** |
| `get-random-sticker`    | read   | `GET /v1/stickers/random`   | —        | `tag`, `rating`                    | **object** |
| `translate-gif`         | read   | `GET /v1/gifs/translate`    | `s`      | `rating`, `weirdness`              | **object** |
| `translate-sticker`     | read   | `GET /v1/stickers/translate`| `s`      | `rating`, `weirdness`              | **object** |
| `get-gif-by-id`         | read   | `GET /v1/gifs/{gif_id}`     | `gifId`  | `rating`                           | object, plus `meta` |
| `get-gifs-by-id`        | read   | `GET /v1/gifs?ids=…`        | `ids`    | `rating`                           | array     |
| `get-categories`        | read   | `GET /v1/gifs/categories`   | —        | —                                  | array     |
| `get-random-id`         | read   | `GET /v1/randomid`          | —        | —                                  | `{ random_id }` |

No action is `perform`. GIPHY's only documented write path is the upload endpoint, which needs a
different, **non-`api_key`** authenticated flow for GIPHY-channel accounts — out of scope, so this
app is read-only and declares no `idempotent` flag it cannot justify.

### Notes on individual actions

- **`search-gifs` / `search-stickers`** — `q` is capped at 50 characters **in the form as well as in
  the API**, because GIPHY documents `414 URI Too Long` for a longer query; failing on the form is
  cheaper than a round trip that always fails. `limit` is prefilled with GIPHY's documented default
  of 25 — a search that silently returns an unbounded list is a footgun, so the number is on screen
  and the beta-key cap of 50 is in the hint. `lang` is offered on `search-gifs` only, which is where
  GIPHY documents it.
- **`get-trending-gifs` / `get-trending-stickers`** — no required parameters. `limit` is *left
  unset*, so GIPHY's own default applies: the endpoint page verified for this app does not state an
  explicit default for the trending family, and a number invented here would be a guess.
- **`get-random-gif` / `get-random-sticker`** — return **one** object. Reading that response as a
  list is the fastest way to get nothing out of these two.
- **`translate-gif` / `translate-sticker`** — `s` is the phrase; the response puts the translated
  GIF in `data`. GIPHY also returns an `analytics` object on this endpoint, and this app does **not**
  expose it: the documentation states that the field exists but not what it contains, and guessing at
  an analytics shape is exactly the inference this app avoids.
- **`get-gif-by-id`** — the id is percent-encoded before it is interpolated into the path. GIPHY ids
  are letters, digits, `-` and `_`, which encoding leaves alone, but a pasted `/` or `?` would
  otherwise be able to redefine the request path. It returns `{ data, meta }`; see finding 4.
- **`get-gifs-by-id`** — one comma-separated `ids` value (up to 100 ids), sent exactly as typed: no
  re-ordering, no de-duplication, no splitting into repeated keys. This is the collection endpoint,
  not a loop over `get-gif-by-id`.
- **`get-categories`** — GIPHY documents no parameters on this endpoint, so this action declares
  none. Output is the name, the URL-encoded name, and the representative GIF's original rendition —
  the fields a picker UI reads, not the whole schema.
- **`get-random-id`** — returns GIPHY's `random_id`. GIPHY documents it as a stable, privacy-safe
  `customer_id` for the other endpoints; **this app does not send `customer_id`** — it is an
  advanced, optional field the documented surface this app is built from does not need — so what
  remains is a random id a workflow can mint and store as its own correlation key.

Output fields are a deliberate subset of the schema, not a typed mirror: `id`, `slug`, `url`,
`embed_url`, `rating`, `title` (GIPHY's schema does not guarantee it, so it is documented as maybe
absent), and `images.original.url`/`width`/`height`. Width and height pass through as **strings**,
which is what GIPHY serves — the schema documents them as strings even though they read as numbers,
and coercing them would change what the API said.

## Health checks

### `service` — GIPHY's status page is real

`GET https://status.giphy.com/api/v2/summary.json`, verified live on 2026-09-22: a genuine GIPHY
Statuspage whose `page.name` is `"GIPHY"`, with GIPHY's own components grouped under an `"API"` group
(`Search`, `Trending`, `Translate`, `Random`, `Media`, `Upload`, `Developers`, `API`) alongside a
separate `"Web & Mobile"` group for giphy.com itself. The overall indicator lives at
`status.indicator` and was `"none"` when checked.

The check reports **the API group only**. An incident on giphy.com is not an incident on
`api.giphy.com`, and a workflow reading this check should see the state of the services its own steps
call. The group is located by name and its children are taken from `group_id`, so the selection
follows GIPHY's own grouping rather than a hard-coded list; the documented API-group names are the
fallback for a page that stops stating group ids.

`status.indicator` is the verdict, mapped as GIPHY documents it: `none` → `ok`, `minor` → `degraded`,
`major`/`critical` → `down`. Statuspage's fifth value, `maintenance`, is mapped to `degraded` — not
observed on GIPHY's page when this app was verified, but part of the vocabulary the page serves from,
and a maintenance window is not a healthy vendor. A status API that 500s, a page that stops
self-identifying as GIPHY's, and a page with no API-group components all report `unknown`, never
`down`.

Severity is left at the `degraded` default: GIPHY is SaaS-only, so an incident here is evidence about
every Connection this app can hold. The check is `credential: "none"` and declares
`status.giphy.com` **on itself**, not on the app's allowlist — a status host must never see an API
key.

### Derived checks and declared absences

- `auth:api-key` — derived automatically from the auth method's `test` hook
  (`packages/apps/HEALTHCHECKS.md`). No placeholder is written for it.
- **No `quota` check.** No `x-ratelimit-*` header, and no other quota header, was observed on a live
  response. There is nothing to read, so nothing is declared.
- **No `unavailable` entry.** GIPHY does publish a status feed, so a declared absence would be false.

## Deliberately not covered

| Endpoint family                                                              | Why not                                                                 |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `/v2/emoji*`                                                                  | A separate API version with a different object shape, not verified in depth here |
| `/v1/channels/search`, `/v1/tags/related/*`, `/v1/gifs/search/tags`, `/v1/trending/searches`, autocomplete/suggestions | Real and documented, but lower-value, and their parameter shapes were not part of this app's verified surface |
| the analytics "Action Register" endpoint                                      | Same — documented, low value here, not verified in depth                |
| the upload endpoint                                                           | Needs a different, non-`api_key` authenticated flow for GIPHY-channel accounts |
| `customer_id` on any action                                                   | An advanced, optional field this app's surface does not need            |
| `analytics` on the translate responses                                        | The field's contents are not documented on the verified pages            |

## Icon

`assets/icon.svg` is simple-icons' GIPHY mark, copied verbatim
(<https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/giphy.svg>, 211 bytes of
`image/svg+xml`; the file adds only a trailing newline). It is the vendor's real, current brand mark.

It is not a favicon scrape: `https://giphy.com/apple-touch-icon.png` answers **404**, and GIPHY's own
CDN asset paths (for example `static/img/giphy-logo-vertical.gif`) are blocked with a 403 — and are a
GIF, not a vector mark anyway.

`tests/index.test.ts` asserts the file is still the mark byte-for-byte, so a later reformat or a
redraw fails the suite rather than falsifying this claim.

The mark is one solid black shape, which reads on a light tile and disappears on a dark one — the
audit measured ΔE 15.2 / contrast 1.34 against the dark tile. So `assets/icon.dark.svg` is also
shipped: **the same artwork, re-inked white** by the pack's own legibility tool
(`_tools/icon-legibility.ts`, which writes the file and declares `appearance.darkMode.icon` in the
manifest). The geometry is untouched — only the paint changes, which is the treatment a brand guide
specifies for its own logo on a dark background.

## Layout

```
index.ts                 entry module — 12 actions, 1 auth method, 1 health check
package.json             manifest (w6w.id io.w6w.giphy, egress api.giphy.com)
lib/client.ts            the only module that knows api.giphy.com; envelope + meta.status handling
lib/params.ts            shared param fragments (rating, limit/offset, weirdness) and GifObject output
auth/api-key.ts          query-string api_key: `sign` merge + body-classified `test` probe
actions/*.ts             one file per action, kebab-case key == filename
health/service.ts        status.giphy.com summary.json → per-component report
assets/icon.svg          the vendor's mark, verbatim
assets/icon.dark.svg     the same mark re-inked white for the dark tile (tool-written)
tests/                   unit tests: actions/, auth/, health/, index — all mocked, no network
```

## Development

```sh
deno task validate   # conformance audit (manifest, spec, sandbox rules, icon legibility)
deno task check      # type-check every module
deno task lint
deno task fmt        # never bare `deno fmt` — the bare form rewrites assets/icon.svg
deno task test       # deno test -A tests/
```

There is no local `deno` on the dev host; run these inside the `api` container, from
`apps/giphy/`.
