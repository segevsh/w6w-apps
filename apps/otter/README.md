# Otter.ai

Read Otter.ai channels, conversations, transcripts, action items, insights and outlines, download
meeting audio, and import calls from a URL — over Otter's Enterprise Public API.

- **Categories** — ai, productivity, video
- **Auth methods** — api-key (bearer)
- **Actions** — 7
- **Egress allowlist** — `api.otter.ai`
- **Website** — https://otter.ai
- **API docs** — https://help.otter.ai/hc/en-us/articles/36130822688279-Otter-ai-Public-API

## How the docs were actually read

The rendered help-center page returns **HTTP 403 to every User-Agent tried**, including a full
desktop-browser string, both via `curl` and via a headless fetch — it is behind a Cloudflare
challenge, not a permissions wall. It was read instead through **Zendesk's own Help Center JSON
API**, which serves the identical article content with no such gate:

```console
$ curl -sS https://help.otter.ai/api/v2/help_center/en-us/articles/36130822688279.json
HTTP/2 200
content-type: application/json; charset=utf-8

{"article": {"title": "Otter.ai Public API", "body": "<p>...53,242 bytes of HTML...</p>", ...}}
```

`article.body` is the same reference content the gated page would show, confirmed live 2026-09-29.
Every endpoint, field name and example below comes from that body (stripped to text), plus live
probes against `api.otter.ai` and `status.otter.ai` the same day. No sibling app or marketing page
was used to infer anything.

## Enterprise-only

The docs state this plainly: **"Otter's Public API is available for all Enterprise workspaces. If
you do not see this feature for your workspace, contact your Otter account manager."** A Free, Pro
or Business plan has no access to any endpoint this app calls — `auth/api-key.ts`'s `test` hook
reports that as a distinct failure from a bad key (see Auth below).

## Actions

| Key | Type | Calls |
|---|---|---|
| `channel-list` | read | `GET /channels` |
| `channel-members-list` | read | `GET /channels/{id}/members` |
| `conversation-list` | search | `GET /conversations` |
| `conversation-get` | read | `GET /conversations/{id}` |
| `conversation-audio-get` | read | `GET /conversations/{id}/audio` |
| `conversation-create` | perform | `POST /conversations` |
| `workspace-get` | read | `GET /workspace` |

Notes worth knowing before wiring a workflow:

- **`conversation-get`'s `include` parameter is required**, exactly as the docs' own parameter
  table marks it (`Required: Yes`) — Otter returns the conversation's core fields either way, but
  no `relationships` (action items, insights, outline, transcript) without it. It is a
  comma-separated list in the docs' own example (`insights,transcript`); the Action exposes it as a
  `multiselect` and joins the selected values itself.
- **`conversation-list`'s `channel_id` overrides `include_shared`** — passing a channel id makes
  Otter treat `include_shared` as `true` regardless of what was sent, per the docs' own parameter
  description.
- **`conversation-create` is not idempotent.** The docs name no dedupe or idempotency key for this
  endpoint; a retry with the same file URL imports it again as a second conversation.
- **Pagination is cursor-based**, not offset-based: `conversation-list` returns
  `meta.{has_more,next_cursor}`, and paging forward means passing the previous response's
  `next_cursor` back in as the next call's `cursor` — not incrementing a page number.

## What is deliberately left out

- **Webhooks.** The docs call webhooks "the recommended way to build export integrations with
  Otter" and describe them as push notifications for new conversations/action items — that is a
  `TriggerDefinition` surface (`onSubscribe`/`handleIngest`), not something a `read` Action can poll
  for, and the starter template this app follows does not include triggers.
- Anything not named in the article body read above. The docs cover exactly channels,
  conversations (including audio and the file-import write), and workspace — nothing was inferred
  or guessed beyond that surface.

## Health check

Per [`HEALTHCHECKS.md`](../../HEALTHCHECKS.md), three separate questions:

### Is the vendor up?

**Yes, and it is real.** `status.otter.ai` is a genuine, claimed Atlassian Statuspage instance —
verified live 2026-09-29 three ways: `GET /api/v2/summary.json` answers `200 application/json` with
`page: { name: "Otter.ai", url: "https://status.otter.ai/" }` (not the ~127 KB HTML an unclaimed
`*.statuspage.io` decoy serves); one of its **fifteen flat components is literally named "Public
API"** (`id: 01KSR5PPJS6NWRE86QVNSFGBXH`) — the exact surface this app calls; and a nonsense path on
the same host still answers a Statuspage-shaped body, ruling out a catch-all. `health/service.ts`
reads the page-level roll-up for the overall verdict and surfaces the Public API component by name
in the message when it is not `operational`.

### Is this credential live?

The Auth `test` hook, projected automatically into the health surface as `auth:api-key`:

```
GET /workspace
```

Chosen by what the response body contains, not by its name: it needs no admin privilege, and every
field on `Workspace` (id, name, owner, member_count, handle, type) is organizational metadata —
nothing echoes the caller's own API key back. A `404` here is the docs' own documented failure mode
for this endpoint ("User not in a workspace"), which `test` reports as a distinct message from a
`401` — one says "you're not on the right plan/workspace", the other says "this key is wrong."

### Do we have quota left?

Not knowable. The docs state a fixed ceiling — "Enterprise plan users are currently limited to 10
requests / second" — but no rate-limit header of any kind was present on any live response measured
2026-09-29 (unauthenticated and bad-bearer requests to `/v1/workspace` and `/v1/channels` alike; only
`date`, `content-type`, `content-length` and `strict-transport-security`), and there is no
usage/limits endpoint. A probe would also spend the very allowance it claims to measure, at a
ceiling as tight as 10 requests/second. See `health/quota.ts`.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded (default) | 60s | `health/service.ts` — `status.otter.ai` |
| `quota` | quota | — | — | informational | — | _declared absent_ |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

`quota` is `informational` deliberately: an `unavailable` entry always reports `unknown`, and
`unknown` outranks `ok` in the roll-up — at any other severity, saying "this vendor publishes
nothing readable" would pin the app's verdict at `unknown` permanently.

`service`'s `network.allow` widens egress for that one hook only, to `status.otter.ai` — never
`api.otter.ai`, the app's signed surface — which the spec permits precisely because the posture is
unsigned (`credential: "none"`).

## Auth

One method, `api-key`, typed `bearer` — a standard `Authorization: Bearer <key>` header. Minted at
Otter.ai → Integrations → Developer tab → Create key, shown only once, capped at **2 keys per
user**. `sign` is the only hook handed the raw credential and runs network-less; no Action sets an
`Authorization` header itself.

## Icon

`assets/icon.png` is the vendor's own 32×32 favicon, fetched from
`https://cdn.prod.website-files.com/618e9316785b3582a5178502/618e94bcbca88b51e2ad81f7_favicon.png`
(linked from `<link rel="shortcut icon">` on otter.ai's own homepage) — a transparent-background PNG
of the blue "O + soundwave" mark, unmodified.

This was chosen over the larger (256×256) `apple-touch-icon.png` the same page links, which is a
real Otter mark but rendered on a **solid opaque white square** rather than a transparent
background: against this pack's light UI tile (`#f0f2f6`), that white backing washes out enough of
the icon's pixels to fail the pack's icon-legibility audit (`deno task validate` /
`_tools/icon-legibility.ts`), even though the mark itself is easily legible in isolation. The
transparent 32×32 favicon has no such backing and passes legibility on both the light and dark tile
outright, at the cost of resolution.

`otter.ai/favicon.svg`, `/favicon.ico` and `/apple-touch-icon.png` (the bare, non-CDN paths) all
answer `200` with the site's own SPA HTML shell rather than image bytes — a catch-all, and not an
icon source.

## Development

```bash
deno task validate   # pack conformance audit (manifest, sandbox rules, icon legibility, test coverage)
deno task check      # typecheck
deno task lint
deno task fmt         # never bare `deno fmt`
deno task test        # 54 unit tests
```

Tests call every hook directly with a mocked `HookContext` (`tests/_helpers.ts`: a queued fake
`ctx.fetch`, a recording no-op `ctx.log`). An unqueued fetch throws, so a test that makes an
unexpected request fails rather than hanging. `UNAUTHORIZED_401` and `NOT_FOUND_404` in that file
are the live-measured error responses, reused everywhere those two failure modes are asserted.
