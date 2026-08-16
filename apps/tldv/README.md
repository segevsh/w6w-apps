# tl;dv

Read tl;dv meeting recordings, transcripts and AI-generated notes, search meetings, and import
external recordings — over the **tl;dv Public API** (`v1alpha1`).

- **Categories** — ai, productivity, video
- **Auth methods** — api-key
- **Actions** — 5
- **Health checks** — 2 (`service`, `api`) + 1 declared absence (~~`quota`~~) + the derived
  `auth:api-key`
- **Egress allowlist** — `pasta.tldv.io` (the `service` check adds `tldv.instatus.com` to its own
  hook allowlist, never to the app's)
- **Website** — https://tldv.io/
- **API docs** — https://doc.tldv.io/
- **Status page** — https://tldv.instatus.com/

> **Everything below was verified against tl;dv's own sources on 2026-08-16** — the OpenAPI 3.0
> document embedded as `__redoc_state.spec.data` in the rendered page at
> [`doc.tldv.io`](https://doc.tldv.io/) (284,855 bytes, `info.version` `v1alpha1`), the prose
> sections of that same page, and live probes against `pasta.tldv.io` and `tldv.instatus.com`.
> Nothing here came from a third-party integration directory or a sibling app's guess.

## The API is `v1alpha1` — literally, not just a version string

The vendor's own words: *"You are pioneering the tl;dv API... Expect upcoming changes as we sculpt
this API masterpiece, evolving towards the stable v1 release."* There is also no sandbox — *"we're
currently all about that production data"* — so every call this app makes is against a real
account's real meetings. Nothing below is deprecated **except** the one endpoint the vendor marks
so explicitly (see below); the alpha label is about the surface changing under you, not about
anything currently documented being unstable.

## Four things that would have cost someone a day

### 1. `api.tldv.io` is a live, resolvable trap

The obvious guess for the API host resolves and answers HTTP requests — but it answers a bare
9-byte `Not Found` in `text/plain` for **every** path, including the ones this API actually serves.
That looks exactly like "a working host, wrong paths" rather than "wrong host entirely", which is
what makes it dangerous. The OpenAPI document declares exactly one server:

```
servers: [{ "url": "https://pasta.tldv.io" }]
```

Confirmed live: `GET https://pasta.tldv.io/v1alpha1/meetings` unauthenticated answers
`401 {"name":"AuthorizationRequiredError", ...}` — a real, mounted endpoint. This app calls
`pasta.tldv.io` and only `pasta.tldv.io`.

### 2. A missing key and a wrong key are indistinguishable

Measured with no `x-api-key` header, an empty header, and a 20-character garbage string — all
three answer the byte-identical body:

```json
{"name":"AuthorizationRequiredError","message":"Authorization is required for request on GET /v1alpha1/meetings"}
```

There is no `token-not-provided` vs `user-or-token-not-found` split the way Apify or GitHub give
you. `auth/api-key.ts` and `lib/client.ts` report the vendor's own `name`/`message` verbatim rather
than inventing a distinction the API itself does not make.

### 3. Query-param validation can run *before* the auth guard

`GET /meetings` with a garbage key answers the `401` above, as expected. But
`GET /meetings?meetingType=bogus` with the **same** garbage key answers a `400` validation error
instead — the invalid enum value short-circuits before the key is ever checked:

```json
{"name":"BadRequestError","message":"Invalid queries, check 'errors' property for more info.",
 "errors":[{"property":"meetingType","constraints":{"isEnum":"meetingType must be one of ..."}}]}
```

So a `400` from this API is never proof a credential was fine — only a `200` is. `auth/api-key.ts`
probes `GET /meetings` with **no query string at all**, sidestepping the ordering trap entirely
rather than trying to characterise it further.

### 4. `organizer` and `template` are objects on the wire — the schema's own `type` lies

The `Meeting` schema types `organizer` as `{"type":"string","format":"json", "$ref":
"#/components/schemas/User"}` and `template` as `{"type":"string","format":"json"}` — contradicting
their own `$ref`s, and (for `template`) pointing nowhere at all. The vendor's own webhook payload
example in the same document settles it: `"template": {"id": "template-1", "label": "Standup
Template"}`, a plain nested object, never a stringified blob to `JSON.parse`. This app's action
outputs follow the `$ref`/example, not the contradictory `type`/`format` annotation.

## Auth

One method: `api-key`, type `apiKey`, header `x-api-key` (no `Bearer` prefix — confirmed against
`components.securitySchemes["Api Key Authentication"]`).

Generated per user at `tldv.io/app/settings/personal-settings/api-keys`. It is **not scoped** — the
docs describe no per-key permission set — but access is still gated, by **plan**, not by the key:

| Meeting organizer's plan | UI access | API access |
|---|---|---|
| Free | Yes (if shared) | **No** |
| Pro / Business | Yes | Yes |
| Enterprise | Yes | Yes |

Programmatic access follows the **meeting organizer's** plan (the calendar-invite organizer, or the
call's creator for an ad-hoc meeting) — not the plan of whoever generated the API key, and not
whether the meeting is *shared* with you. A live key can legitimately return an empty
`meeting-list` for an account that sees plenty of meetings in the tldv.io UI; that is documented
plan scope working as intended, not a broken Connection.

### The probe is `GET /meetings`, with no query string

There is no dedicated ping that needs a credential — `/v1alpha1/health` is real but
**unauthenticated** (see `api` below), so it cannot tell a good key from a bad one — and no whoami:
tl;dv publishes no `/me` or `/user` route at all. `GET /meetings` is therefore the cheapest read the
narrowest usable (unscoped, since there is no scoping) credential can perform, sent with no query
parameters at all to avoid finding #3 above.

## Actions

5 actions. `resource` groups them in the editor.

| Key | Type | Endpoint |
|---|---|---|
| `meeting-list` | search | `GET /v1alpha1/meetings` |
| `meeting-get` | read | `GET /v1alpha1/meetings/{meetingId}` |
| `transcript-get` | read | `GET /v1alpha1/meetings/{meetingId}/transcript` |
| `notes-get` | read | `GET /v1alpha1/meetings/{meetingId}/notes` |
| `meeting-import` | perform | `POST /v1alpha1/meetings/import` |

### Notes on individual actions

- **`meeting-list`'s query shape isn't wired to its own OpenAPI path.** The `GET /meetings`
  operation declares zero `parameters` in the document; the actual query fields
  (`query`, `page`, `limit`, `from`, `to`, `onlyParticipated`, `meetingType`) live only in the
  separate `GetMeetingsQueryParams` schema. This app builds the form from that schema. `limit`
  defaults to 50 here, matching tl;dv's own documented default (max 100; **total results across all
  pages cannot exceed 10,000** — narrow the date range if it does). `onlyParticipated` is sent only
  when `true`; the vendor documents no `false` behaviour for any boolean query param, so `false` (the
  default) is simply omitted rather than guessed at.
- **`meeting-import` starts a job — it does not hand back the imported meeting.** The response is
  `{success, jobId, message}`, not a `Meeting`, and there is no documented "check import job status"
  endpoint. The only way to find the resulting meeting today is `meeting-list` afterwards, by name or
  recency, once tl;dv finishes processing. `idempotent: false`: every call starts a separate import,
  and there is no idempotency key of any kind to dedupe retries.
- **`meeting-import`'s `happenedAt` needs fractional seconds.** The vendor's own regex is
  `\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d.\d+Z?` — note the required `.\d+` — so
  `2024-01-15T09:00:00Z` (no fractional part) fails validation where `2024-01-15T09:00:00.000Z`
  passes. The param is a plain `string` with that exact example in its placeholder rather than a
  `datetime` param, because a generic datetime picker is not guaranteed to emit the fractional
  seconds this endpoint requires.
- **`transcript-get` and `notes-get` both require the transcript to be complete.** The vendor's own
  description: *"The transcript is returned only if it is complete."* What happens for a
  still-processing meeting is not documented in the OpenAPI schema (no example, no distinct error
  code named), so this app makes no claim about it beyond surfacing whatever `lib/client.ts` gets
  back as an ordinary action error.

## Health checks

Two live checks plus one declared absence, plus the derived `auth:api-key`.

### `service` — Instatus, not Statuspage

tl;dv publishes at **`tldv.instatus.com`**, checked three ways:

| Path | Status | Bytes | Content type |
|---|---|---|---|
| `/v2/components.json` | 200 | 961 | `application/json` |
| `/summary.json` | 200 | 73 | `application/json` |
| `/definitely-not-real-zzz.json` | **404** | 7,001 | `text/html` |

Not a catch-all, and (unlike some Instatus pages in this pack) `/v2/components.json` and
`/summary.json` are **not** byte-identical here, so reading the richer per-component endpoint is a
real choice. `tldv.statuspage.io` — the obvious Atlassian-style guess — 302s to
`www.statuspage.io`, the standard signature of an unclaimed Statuspage subdomain; tl;dv never set
one up there. The Instatus page's `page.name` is `"tl;dv"` and its eight components are tl;dv's own:
`WebApp`, three per-platform "Assistant Recorder" bots (Google Meet, Zoom, Microsoft Teams),
**`Public API`**, `Webhooks & integrations`, `AI notes` and `AI reports`. The verdict follows the
`Public API` component alone — the others are reported for attribution but never move it, in either
direction: a `WebApp`-only outage should not fail this app's actions, and a `Public API` outage must
not hide behind a green page-level rollup while the recorder bots are fine.

### `api` — tl;dv's own dedicated health route

`GET /v1alpha1/health` → `200 {"status":"ok"}`, **unauthenticated** — confirmed a real, dedicated,
GET-only route (a nonsense sibling path 404s with Express's own `Cannot GET ...`, and `POST
/v1alpha1/health` also 404s). This is the "dedicated ping" every app in this pack hopes for, and
this app is one of the few that gets one. Because it needs no credential it cannot answer "is my key
live" — that stays the derived `auth:api-key` check's job — but it is a genuine, first-party signal
that `pasta.tldv.io` itself is up and routing, complementing the human-updated `service` page.

### ~~`quota`~~ — a declared absence, informational

No rate-limit or usage-metering header or endpoint appears anywhere in the OpenAPI document, and
none was observed live (a probe response carried no `X-RateLimit-*` or `Retry-After`). tl;dv's
metering axis is the plan table above — export access gated by the meeting organizer's plan — not a
per-key request quota with a ceiling and a current figure to read.

## Deliberately not covered

- **`highlights` (`GET /meetings/{meetingId}/highlights`).** The vendor's own OpenAPI document marks
  the operation `"deprecated": true`, under the tag `"Highlights (deprecated)"`, with the
  description *"Use the /meetings/:meetingId/notes endpoint instead."* This app implements `notes`
  only.
- **"Download recording" (`GET /meetings/{meetingId}/download`).** The endpoint's real behaviour is
  a `302` redirect to a short-lived (6-hour) **signed URL** for the actual media file — the vendor's
  own docs say so explicitly: *"If you disable redirect following, read the `Location` header to
  obtain the signed URL."* This runtime's sandboxed `ctx.fetch` cannot do that: redirect handling
  happens host-side (`packages/core/packages/runtime/src/runtime.ts`'s `hostFetch`) as a plain
  `fetch()` with no `redirect` option, so a 302 is always followed transparently, and the
  `WireResponse` the sandbox worker receives back carries no final URL and no `Location` header —
  only the fully-downloaded body. There is no way for an Action to expose the signed URL itself
  without pulling the entire — potentially multi-gigabyte — recording through the sandbox on every
  call, with no size cap anywhere in the runtime to bound that. Rather than ship an action that
  either lies about returning "a URL" or silently downloads an unbounded binary, this is left out.
  Revisit if the runtime ever exposes `redirect: "manual"` semantics or the final response URL to
  `ctx.fetch`.
- **Webhooks** (`MeetingReady`, `TranscriptReady`) — a Trigger, not an Action; the starter contract
  this pack follows does not include triggers unless asked. The vendor's webhook payload examples
  were still useful here: they are what settled finding #4 above.

Nothing was left out because it could not be confirmed: every endpoint above is documented in the
vendor's own OpenAPI document and was read there.

## Icon

`assets/icon.png` is tl;dv's own favicon, downloaded **verbatim** from `https://tldv.io/favicon.ico`
— which serves PNG data, not the `.ico` its own extension claims — 482 bytes, 32×32, 8-bit
colormap, md5 `121d8413bf211f7b6f4164a773cc9c50`. It is low resolution (32×32; there is no larger
verified source) and is not modified, replaced or regenerated here, and is not touched by
`deno task fmt`, whose file list names only the `.ts` directories.

## Layout

```
tldv/
├── package.json                 # manifest — the `w6w` identity block
├── index.ts                     # entry: { actions, auth, healthChecks }
├── lib/
│   ├── client.ts                # TldvClient, error formatting, query compaction
│   └── params.ts                # shared Param fragments (meetingId, meetingType options)
├── auth/api-key.ts              # x-api-key header: sign, test
├── actions/                     # one file per action (5)
├── health/
│   ├── service.ts                # tldv.instatus.com, Public API component
│   ├── api.ts                    # GET /v1alpha1/health, unsigned
│   └── quota.ts                  # declared absence, informational
├── assets/icon.png               # vendor mark, verbatim
└── tests/                        # entry module, every action, auth, health, lib
```

## Development

From this directory, inside the `api` container:

```bash
deno task validate   # manifest + sandbox-rule audit (_tools/audit.ts)
deno task check       # typecheck
deno task lint
deno task fmt          # never bare `deno fmt` — the task's file list excludes assets/
deno task test
```

`deno task validate` passes `--config ./deno.json` explicitly — see the sibling `apify`/`paddle`
apps for why that flag matters.
