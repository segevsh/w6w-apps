# Miro

Create and read Miro boards, sticky notes, cards, shapes, connectors and tags.

- **Categories** — productivity, project-management
- **Auth methods** — oauth2
- **Actions** — 27
- **Egress allowlist** — `api.miro.com`
- **Website** — https://miro.com
- **API docs** — https://developers.miro.com/reference/api-reference ·
  schema: https://github.com/miroapp/api-clients (`packages/generator/spec.json`)

## Setup

### OAuth (Sign in with Miro)

The **only** auth Miro's API offers — its OpenAPI document declares exactly one
security scheme, `oAuth2AuthCode`, with no API-key alternative. Requires a Miro
app registered on this w6w installation (`client_id` / `client_secret` /
`redirect_uri` live on the w6w server, not in this package).

- Authorize — `https://miro.com/oauth/authorize`
- Token / refresh — `https://api.miro.com/v1/oauth/token`
- Scopes — `boards:read`, `boards:write`

Verified live 2026-08-18: the authorize endpoint answers `308` to its
trailing-slash form (a real endpoint normalising the path), and the token
endpoint answers `401 {"status":401,"code":"tokenNotProvided",…}` — Miro's own
error envelope.

Miro's document lists nine scopes; this app requests the two its actions need.
`organizations:read`, the audit-log scopes and the iframe ones
(`microphone:listen`, `screen:record`, `webcam:record`) belong to surfaces this
app deliberately does not implement, and asking for them would widen what every
installing user has to grant. `afterConnect` records the scopes Miro actually
**granted**, which is often fewer than were requested.

## Actions

| Key | Type | Description |
|---|---|---|
| `board-list` | read | List boards, filtered by team, project, owner or name |
| `board-get` | read | Get one board's details and sharing policy |
| `board-create` | perform | Create a board |
| `board-copy` | perform | Duplicate a board — the template workflow |
| `board-update` | perform | Change a board's name, description or policy |
| `board-delete` | perform | Move a board to the trash |
| `item-list` | read | List a board's items, optionally by type |
| `item-list-in-frame` | read | List the items inside one frame |
| `item-list-by-tag` | read | List the items carrying one tag |
| `item-get` | read | Get one item of any type |
| `item-move` | perform | Reposition an item or move it into a frame |
| `item-delete` | perform | Delete one item of any type |
| `items-create-bulk` | perform | Create up to 20 mixed items in one request |
| `sticky-note-create` | perform | Add a sticky note |
| `sticky-note-update` | perform | Change a sticky note's text, colour or size |
| `card-create` | perform | Add a card with title, description, assignee, due date |
| `text-create` | perform | Add a free text item |
| `shape-create` | perform | Add a shape, optionally with text inside |
| `frame-create` | perform | Add a frame to hold other items |
| `image-create` | perform | Place an image by URL |
| `connector-create` | perform | Draw a line between two items |
| `connector-list` | read | List a board's connectors |
| `tag-create` | perform | Create a tag on a board |
| `tag-list` | read | List a board's tags |
| `tag-attach` | perform | Put an existing tag on an item |
| `board-member-list` | read | List who has access to a board |
| `board-share` | perform | Invite people to a board by email |

### The spec's renamed path parameters are artifacts, not endpoints

Miro's OpenAPI document lists several board endpoints under renamed path
parameters — `/v2/boards/{board_id_PlatformTags}/items`,
`{board_id_PlatformContainers}`, `{board_id_PlatformFileUpload}`. The rename
lets the same path appear more than once under different tags; each one's
description is the same "Unique identifier (ID) of the board", and **on the
wire they are all `/v2/boards/{board_id}/…`**, distinguished only by their
query parameters.

That is why `item-list`, `item-list-in-frame` and `item-list-by-tag` are three
actions hitting one URL: bare it lists everything, `parent_item_id` scopes it to
a frame, `tag_id` scopes it to a tag. A generator that copied the templates
literally would emit URLs Miro does not serve, so a test asserts no action
contains a `board_id_Platform…` placeholder.

### Two pagination contracts, and they are not interchangeable

- **Cursor** (`{data, total, size, cursor, limit}`) — the board **items** and
  **connectors** collections. Walked by passing `cursor`; absent on the last
  page.
- **Offset** (`{data, total, size, offset, limit}`) — `GET /v2/boards`, the
  **tags** and **board members** lists, and the **by-tag** item variant. Walked
  by advancing `offset` until `total` is reached.

`lib/client.ts` implements both and each action uses the one its endpoint
declares. Using the wrong one silently returns a single page, which is the kind
of bug that looks like "the API only has 50 items".

### Experimental paths are avoided

Miro publishes `/v2-experimental/…` for mindmap nodes, code widgets and
flowchart shapes, and reserves the right to change those without a version
bump. This app uses only stable `/v2` endpoints — `shape-create` documents that
it takes the stable shapes path rather than the experimental flowchart one — and
a test asserts no action calls an experimental URL.

### Item geometry rules that produce 400s

- **Sticky notes take a width OR a height, never both** — Miro derives the
  other from the content. Both together is rejected locally with a message
  naming the rule, rather than as a bare 400.
- **Text items take a width only.** Their geometry schema has `width` and
  `rotation` and no `height`, because the height follows the text.
- **Position is omitted entirely when neither coordinate is set**, so Miro
  places the item itself instead of pinning it to `(0, 0)`.

### Bulk saves round trips, not quota

`items-create-bulk` posts a **bare array** (the schema's request body is
`{"type":"array"}`, not an object) and accepts at most 20 items. Miro's own
description of the endpoint spells out the cost: rate limiting is "Level 2 per
item", so one sticky note plus one card plus one shape in a single call costs
**300 credits** — 100 each — not 100 for the call.

### List actions declare no `output` fields

Seven list actions unwrap Miro's `data` envelope and return the bare array, so
there are no top-level fields for an `output` declaration to name. The pack
auditor warns about them; the warning is the accurate signal.

### Deliberately out of scope

- **File uploads.** The image and document endpoints have a multipart arm for
  uploading from a device, which an action's JSON body cannot express —
  `image-create` takes a URL and says so.
- **The Enterprise surface** (`/v2/orgs/…`): organizations, teams, projects,
  audit logs, legal holds, board exports, data classification. A large,
  plan-gated administration API needing scopes this app does not request.
- **SCIM** (`/Users`, `/Groups`, `/Schemas` at the document root) — directory
  provisioning, not board automation.
- **App cards, embeds, documents and mindmaps.** Real item types, each its own
  resource with its own fields; the seven here are what a board-building
  workflow reaches for.

## Health check

Three questions get confused with each other, so this section keeps them apart:
is the *vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**Statuspage — read from `status.json`, which is the opposite of this pack's
usual choice.** The convention here is to prefer `summary.json` because it
carries a per-component breakdown for the same single request. Miro's does not.
Verified 2026-08-18:

```
GET https://status.miro.com/api/v2/status.json  -> 200, 198 B
    {"page":{"id":"01JGBY6SXZ5B7XAV0K4CFM96F0","name":"Miro",…},
     "status":{"description":"All Systems Operational","indicator":"none"}}
GET https://status.miro.com/api/v2/summary.json -> 200, 214 B, "components": []
GET https://status.miro.com/api/v2/components.json -> 200, 18 B, {"components":[]}
```

The empty array is Miro's answer, not a parse failure — so the extra payload
buys nothing and the smaller document is the honest probe. No components are
reported for the same reason they are not fetched: there are none, and
synthesising one from the rollup would be a fiction.

### Is this credential live?

`GET /v1/oauth-token` — Miro's token-introspection endpoint. It takes no board
or team id and needs no board scope, so it proves the credential without
assuming the connection can already reach any particular board. It also returns
the granted scopes and owning user, which is what `afterConnect` records.

### Do we have quota left?

**Declared unavailable — Miro publishes the cost, never the balance.** This one
was worth checking carefully, because Miro's metering is unusually well
documented and it is tempting to assume a header exists:

- Miro meters in **credits**, and its OpenAPI document records the tier of
  every operation in that operation's own description ("Rate limiting: Level 1 /
  Level 2 / Level 4"). It even spells out the arithmetic for bulk calls.
- But the **remaining** side is absent: the document declares response headers
  under exactly two names across all 114 paths — `ETag` and `Location` — and the
  string `x-ratelimit` does not appear in it anywhere. `429` responses are
  declared, but only as an outcome.
- A live call carries nothing either: `POST /v1/oauth/token` answers 401 with
  only Miro's error envelope.

So a probe could only report a number it invented. Exhaustion surfaces as a 429,
which the client raises with Miro's own `code` intact.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `GET status.miro.com/api/v2/status.json` |
| `quota` | quota | — | — | informational | — | declared `unavailable` — cost is published, headroom is not |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` method's `test` hook |

## Icon

`assets/icon.svg` — the Miro mark, from
<https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/miro.svg>, downloaded
2026-08-18.

- **259 bytes**, md5 `db7fddaed0a285cb968dcc292214980c`, `<title>Miro</title>`,
  `viewBox="0 0 24 24"`
- inked with `#050038`, the hex simple-icons records for this brand
- `assets/icon.dark.svg` is the same artwork reversed to white by
  `_tools/icon-legibility.ts`, since the near-black navy disappears on the dark
  tile
- re-framed onto the pack's square canvas by `_tools/icon-normalize.ts`; the
  path data inside the nested `<svg>` is the vendor's, verbatim

---

Researched and endpoint-verified 2026-08-18 against Miro's own OpenAPI document
(the `miroapp/api-clients` repository, "Miro Developer Platform" v2.0, 114
paths — confirmed via the GitHub API to be Miro's org repo and not a fork), plus
live probes of `miro.com/oauth/authorize`, `api.miro.com/v1/oauth/token` and
`status.miro.com`. Status surfaces move; re-check if a probe starts failing for
everyone at once.
