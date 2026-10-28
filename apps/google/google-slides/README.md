# Google Slides

Create and edit Google Slides presentations: slides, text, images, shapes and tables.

- **Categories** — documents, productivity
- **Auth methods** — oauth2, service-account
- **Actions** — 17
- **Egress allowlist** — `slides.googleapis.com`, `oauth2.googleapis.com`, `www.googleapis.com`

## Links

| What | URL |
|---|---|
| **Website** | https://www.google.com/slides/about/ |
| **API docs** | https://developers.google.com/workspace/slides/api/reference/rest |
| **Discovery document** | https://slides.googleapis.com/$discovery/rest?version=v1 |
| **Usage limits** | https://developers.google.com/workspace/slides/limits |
| **Source / git repo** | https://github.com/googleworkspace/python-samples/tree/main/slides |

There is **no vendor source repository for Google Slides itself** — it is closed, hosted
software. The repo linked above is Google Workspace's own Slides API sample code; the
generated client libraries live per-language under the `googleapis` org (e.g.
`googleapis/google-api-python-client`), not in a Slides-specific repo. The link is given
so the "source" column points at something real rather than at nothing.

The candidate entry cited `https://developers.google.com/slides/`. That URL is alive but is
a redirect — it lands on `https://developers.google.com/workspace/slides`. The table above
uses the destination, and every endpoint in this app was transcribed from the **discovery
document**, not from prose.

## Actions

Every path below is taken from the live discovery document (revision `20260729`), not from
memory. The Slides API is tiny — **five** methods in total — and almost the entire surface
lives inside the 44-member `Request` union that `presentations.batchUpdate` accepts.

| Key | Type | Endpoint |
|---|---|---|
| `presentation-create` | perform | `POST /v1/presentations` |
| `presentation-get` | read | `GET /v1/presentations/{presentationId}` |
| `presentation-batch-update` | perform | `POST /v1/presentations/{id}:batchUpdate` (raw `requests[]`) |
| `page-get` | read | `GET /v1/presentations/{id}/pages/{pageObjectId}` |
| `page-get-thumbnail` | read | `GET /v1/presentations/{id}/pages/{pageObjectId}/thumbnail` |
| `slide-create` | perform | `:batchUpdate` → `createSlide` |
| `slide-move` | perform | `:batchUpdate` → `updateSlidesPosition` |
| `object-duplicate` | perform | `:batchUpdate` → `duplicateObject` |
| `object-delete` | perform | `:batchUpdate` → `deleteObject` |
| `text-insert` | perform | `:batchUpdate` → `insertText` |
| `text-delete` | perform | `:batchUpdate` → `deleteText` |
| `text-replace-all` | perform | `:batchUpdate` → `replaceAllText` |
| `shapes-replace-with-image` | perform | `:batchUpdate` → `replaceAllShapesWithImage` |
| `image-create` | perform | `:batchUpdate` → `createImage` |
| `shape-create` | perform | `:batchUpdate` → `createShape` |
| `table-create` | perform | `:batchUpdate` → `createTable` |
| `element-alt-text-update` | perform | `:batchUpdate` → `updatePageElementAltText` |

Every `presentationId` param accepts either a raw ID or a pasted
`https://docs.google.com/presentation/d/<id>/edit` URL. The published
`https://docs.google.com/presentation/d/e/<id>/pub` identifier is deliberately **not**
unwrapped — that `e/` id is a different identifier and the API rejects it. (Same rule, same
reason, as `google-forms`.)

### How `batchUpdate` was scoped, and why

`Request` is a union of 44 members. Shipping one action per member would produce 44 forms,
most of them a single deep JSON blob plus a `fields` mask — a worse interface than handing
the object to Google directly. Shipping only the raw escape hatch would make the common
cases ("add a slide", "fill the title", "swap the logo") require hand-written JSON.

The line drawn here: **a member gets a per-verb action when its inputs are shallow and
stable enough to flatten into form fields without losing anything.** Twelve qualify. The
other thirty-two are reachable, verbatim, through `presentation-batch-update`. Concretely,
left in the escape hatch:

- **every `update*Properties` request** (`updateShapeProperties`, `updatePageProperties`,
  `updateTextStyle`, `updateParagraphStyle`, `updateTableCellProperties`,
  `updateLineProperties`, `updateVideoProperties`, `updateImageProperties`,
  `updateTableRow/ColumnProperties`, `updateTableBorderProperties`,
  `updateSlideProperties`, `updatePageElementTransform`, `updatePageElementsZOrder`) —
  each pairs a `fields` FieldMask with a nested style object (colour, weight, dash, fill,
  outline, shadow, alignment, spacing). Flattening those is a second schema to maintain,
  and it would go stale the moment Google adds a property;
- **the Sheets-chart family** (`createSheetsChart`, `refreshSheetsChart`,
  `replaceAllShapesWithSheetsChart`) — these need a `spreadsheets` OAuth scope this app
  deliberately does not request. See *Auth*;
- **table structure editing** (`insertTableRows/Columns`, `deleteTableRow/Column`,
  `mergeTableCells`, `unmergeTableCells`) — plausible per-verb candidates, left out to keep
  the first cut focused on the create/fill path; they are two-integer requests and are easy
  to promote later;
- **`createLine`, `createVideo`, `rerouteLine`, `updateLineCategory`, `groupObjects`,
  `ungroupObjects`, `replaceImage`, `createParagraphBullets`, `deleteParagraphBullets`** —
  lower-frequency verbs that would each add a form for little gain.

`google-docs` in this pack made the same trade (18 per-verb actions plus
`document-batch-update`); this is the same shape of answer against a bigger, deeper union.

### Notes that are easy to get wrong, and are therefore encoded in the actions

- **`presentations.create` ignores nearly everything you send it.** The discovery
  description is explicit: it "creates a blank presentation using the title given in the
  request", uses a supplied `presentationId` if present, and "**other fields in the request,
  including any provided content, are ignored**". So `presentation-create` exposes exactly
  `title` and `presentationId` — no `pageSize`, no `locale`, no `slides`. Content is a
  follow-up `:batchUpdate`.
- **Slides' `WriteControl` has only `requiredRevisionId`.** The Docs and Forms APIs also
  offer `targetRevisionId`; Slides does not. Sending the Docs shape here produces a
  silently-ignored write control, so the type models one arm and only one.
- **`batchUpdate` is atomic.** "If any request is not valid, then the entire request will
  fail and nothing will be applied", and the updates are "applied together atomically".
  There is therefore no partially-applied 200 to defend against. Replies map 1:1 with
  requests and are `{}` for requests that return nothing — an empty reply is success, not
  failure. See *A 2xx that means nothing happened* below for the case that **is** real.
- **`createSlide`'s layout reference is a union.** Either `predefinedLayout` or `layoutId`,
  never both. `placeholderIdMappings` "can only be used when `slide_layout_reference` is
  specified" — supplying mappings without a layout is rejected locally rather than sent.
- **Index semantics differ per request.** `insertText.insertionIndex` defaults to 0, so
  omitting it **prepends**, it does not append. `updateSlidesPosition.insertionIndex` is
  "based on the slide arrangement *before* the move takes place". `createSlide`'s index may
  be omitted to append. These are the reason `slide-move`, `text-insert`, `slide-create`,
  `object-delete` and `object-duplicate` are all declared **non-idempotent**.
- **`deleteText`'s `Range` has three mutually-exclusive shapes.** `ALL` forbids both
  indices; `FIXED_RANGE` requires both; `FROM_START_INDEX` requires the start and forbids
  the end. All three are checked before the request leaves, so the error names which rule
  was broken instead of surfacing a bare 400.
- **A table cell location is two indices or none.** `cellLocation` is only legal when the
  object is a table, and `rowIndex: 0, columnIndex: 0` is a real location — the code tests
  for `undefined`, not for falsiness.
- **`replaceMethod` on `replaceAllShapesWithImage` is deprecated** in favour of
  `imageReplaceMethod`. Only the modern field is exposed, and a test asserts the deprecated
  one is never emitted.
- **Thumbnails come from Slides, not Drive.** `presentations.pages.getThumbnail` lists
  `presentations` / `presentations.readonly` among its scopes — rendering a slide needs no
  Drive grant. Its `contentUrl` has "a default lifetime of 30 minutes", is "tagged with the
  account of the requester", and the only `mimeType` in the enum is `PNG`. It is billed
  against Google's **expensive** read quota (300/min/project, 60/min/user — a tenth of the
  ordinary budget), so thumbnailing a long deck in a tight loop will 429.

### A 2xx that means nothing happened

`batchUpdate`'s atomicity rules out a partially-applied success, but two requests still
answer **200 while doing nothing**: `replaceAllText` and `replaceAllShapesWithImage` return
`occurrencesChanged`, and a search string that matches nowhere is a perfectly successful
no-op. Worse, `occurrencesChanged` is an `int32`, and protobuf JSON omits fields at their
default — so "changed nothing" arrives as `replies: [{ replaceAllText: {} }]`, an empty
object, not an explicit zero.

Both actions therefore:

1. normalise the missing field to a real `0` and lift `occurrencesChanged` to the top of
   the output, so a workflow can branch on it; and
2. offer `failIfNoMatch` (opt-in, default **off**, so the wire behaviour is unchanged unless
   you ask) which turns a zero-match run into a thrown error — the right default for the
   template case, where zero matches means a placeholder was renamed and everything
   downstream is now silently wrong.

The credential path has its own version of this: the service account's token exchange can
answer 200 with no `access_token`. That is treated as a failure, and the resulting message
quotes only Google's `error` field — never the signed assertion.

### Not implemented, and why

- **Drive-side operations.** Placing a new deck in a folder, sharing it, renaming the file,
  or exporting the whole presentation to PDF/PPTX are all **Drive** methods
  (`files.update`, `permissions.create`, `files.export`) — none of them exist on the Slides
  API. `google-docs` reaches into Drive because Docs' own create method cannot make a file
  in a folder; Slides' create method has the same limitation, but the fix is to use the
  `google-drive` app rather than to widen this app's OAuth grant to Drive for one
  convenience field. This is the one place this app deliberately diverges from its Google
  siblings, and it is why its allowlist has no Drive API host.
- **A "list slides" action.** n8n ships one, but it is not an endpoint: it fetches the
  presentation and projects `.slides`. `presentation-get` already returns that array, so a
  separate action would invent an endpoint that does not exist.
- **A "list presentations" action.** The Slides API has no list method at all; enumerating
  decks is Drive's `files.list` filtered by `application/vnd.google-apps.presentation`. That
  belongs in the `google-drive` app, for the same reason as above. (`google-forms` does
  ship a Drive-backed `list-forms` — it had to, because the Forms API is unusable without
  one and Forms already needed a Drive scope. Slides does not.)
- **Sheets-chart embedding.** `createSheetsChart`, `refreshSheetsChart` and
  `replaceAllShapesWithSheetsChart` are verified to exist, but they require a
  `spreadsheets` scope. Rather than request it for everyone, the requests remain reachable
  through `presentation-batch-update` and the scope is documented as something you add
  yourself.
- **Triggers.** The Slides API has no watch/push mechanism of any kind — change
  notifications for a Slides file come from Drive's `files.watch`, which needs a Pub/Sub or
  webhook endpoint and belongs to `google-drive`.

## Auth

Two methods, mirroring the other Google apps in this pack.

**`oauth2`** — the "sign in with Google" flow. Requires a Google Cloud OAuth 2.0 client
configured on the w6w installation with the Google Slides API enabled.

| Scope | Needed for |
|---|---|
| `https://www.googleapis.com/auth/presentations` | all five methods — `create`, `get`, `batchUpdate`, `pages.get`, `pages.getThumbnail` |

That is the **whole** grant, and it is one scope narrower than every sibling Google app
here. Checked against the per-method `scopes` list in the discovery document,
`presentations` appears on all five methods, so nothing else is needed. Deliberately not
requested:

- **`drive` / `drive.file` / `drive.readonly`** — `google-docs` and `google-forms` ask for a
  Drive scope because they *call* Drive. This app calls no Drive endpoint (see *Not
  implemented*), so asking would widen the grant for nothing.
- **`spreadsheets` / `spreadsheets.readonly`** — only the three Sheets-chart members of the
  batchUpdate union need them, and no action ships for those. Add the scope to
  `auth/oauth2.ts` yourself if you push one through the raw escape hatch; it is not
  requested silently.
- **`presentations.readonly`** — strictly weaker than `presentations`, which is already
  granted. Asking for both adds consent-screen noise and nothing else.

`access_type=offline` + `prompt=consent` are forced on the authorize URL, or Google silently
omits `refresh_token` for returning users. PKCE is off: this is a server-side app and the
client secret is the trust anchor.

**`service-account`** — JWT-bearer, for server-to-server runs. Paste a service account's
`client_email` and PEM `private_key`; each request signs an RS256 assertion and exchanges it
at `oauth2.googleapis.com/token` for the same single `presentations` scope. Slides-specific
caveats:

- A presentation the service account **creates** is owned by the service account, which has
  no Drive UI — nobody can open it. Create as a user, or hand ownership over afterwards.
- A presentation it **reads or edits** must be shared with the service account's email,
  exactly like sharing with a person.
- Domain-wide delegation (the optional `subject` field) is usually what you actually want,
  so the account acts as a real user and decks land in a real Drive.
- The optional `scopes` field is the supported way to add `spreadsheets` for chart requests.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — machine-readable, the Google Workspace Status Dashboard.

```
GET https://www.google.com/appsstatus/dashboard/incidents.json
```

The dashboard publishes an incident *feed*, not a current-state rollup, so "up" is the
absence of an open incident — an entry with no `end` is still running. The feed covers all
of Workspace, so it is filtered to `service_name == "Google Slides"`; a Meet outage is not a
Slides outage, and a test asserts exactly that.

`status_impact` maps `SERVICE_OUTAGE → down`, `SERVICE_DISRUPTION → degraded`,
`SERVICE_INFORMATION → ok`. A dashboard that itself fails reports `unknown`, never `down` —
a broken status page tells us nothing about Google.

**Why this page was trusted** — the three checks, run 2026-08-03:

| Check | Evidence |
|---|---|
| (a) bogus sibling path is not a catch-all | `…/dashboard/incidentsZZZ.json` → **404**, `text/html`, 1 599 B, md5 `dd13af57280d`. The real path → **200**, 419 873 B, md5 `4a96931258f2`. Different status, type, size and bytes. |
| (b) content-type **and** body match the extension | `incidents.json` returns `application/json` and parses as a JSON **array** of incident objects with `service_name` / `status_impact` / `end`. No HTML behind a `.json` path. |
| (c) the page describes **this** product | Served from `www.google.com` — the vendor's own apex, not a third-party status host. `…/dashboard/products.json` (200, `application/json`, 1 959 B) lists 36 Workspace products including exactly `{"title": "Google Slides", "id": "DvWBgkXVhodA3WYwgZoB"}`, so the `service_name` filter matches a real product rather than silently matching nothing. |

**On severity.** The check keeps the `service` kind's default `degraded` rather than being
downgraded to `informational`. The downgrade rule exists for rollups that cover surfaces an
app never touches (`apps/discourse`) or that have to be narrowed to one component
(`apps/followupboss`, `apps/circle`). This probe is **already narrowed** — it filters the
Workspace-wide feed down to the single `Google Slides` product before deciding anything, so
what it reports is this app's surface and nothing else. Every sibling Google app in the pack
makes the same call, and an inconsistent answer across the Google family would itself be a
bug.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

| Auth method | Probe |
|---|---|
| `oauth2` | `POST https://oauth2.googleapis.com/tokeninfo` (token in the **form body**) |
| `service-account` | `POST https://oauth2.googleapis.com/token` (JWT grant) |

The Slides API is per-presentation: all five methods require a `presentationId`, and there
is no whoami, ping or list endpoint a credential can reach without already knowing a deck.
So there is nothing cheap to probe on the API itself, and the check validates the *token*
instead — the same choice, for the same reason, as the Sheets, Docs and Forms apps in this
pack.

Two details of that choice, both deliberate:

- **The probe was chosen by reading its response body, not its name.** `tokeninfo` returns
  token *metadata* — `aud`, `azp`, `scope`, `exp`, `expires_in` — and never echoes the token
  back, so reading the response cannot leak the credential. (Contrast Follow Up Boss's
  `/me`, which returns the caller's own API key.)
- **The token is POSTed form-encoded, not appended as `?access_token=…`.** The endpoint
  accepts both; the sibling Google apps use the GET query form. POST keeps the bearer token
  out of the request URL and therefore out of proxy logs and error strings, which is the one
  place this app knowingly differs from its siblings' mechanics. The endpoint, and the
  reason for choosing it, are identical. A test asserts the credential never appears in the
  URL.

The service-account method proves its credential by exchanging its signed JWT for an access
token; there is no user token to introspect, and a 200 carrying no `access_token` is treated
as a failure.

### Do we have quota left?

Declared absent. Google publishes the ceilings — **3 000** read / **300** expensive read
(`presentations.pages.getThumbnail`) / **600** write requests per minute per project, and
**600** / **60** / **60** per user per project — but exposes no counter for consumption and
returns no `RateLimit-*` headers. The only signal is a `429` after the fact, and consumption
is visible only in the Google Cloud console. Stated as a positive fact rather than left as a
gap.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 120s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |
| `auth:service-account` | credential | connection | signed | fatal | — | derived from the `service-account` auth method's `test` hook |

The host `www.google.com` (for `service`) is reachable **only inside that hook's worker** —
not from any action, and not from the other checks. The spec allows the widening precisely
because the check is unsigned; pairing an extra host with `credential: "signed"` is rejected
at load time, so a credential can never reach a status host.

**`quota` is declared absent.** A declared absence always reports `unknown`, so it carries
`severity: "informational"` — otherwise it would pin every verdict for this app at `unknown`
forever.

## Icon

`assets/icon.svg` is the real Google Slides mark, ported byte-for-byte from n8n's
`packages/nodes-base/nodes/Google/Slides/googleslides.svg` (524 B, md5
`8dc54753afdf243d8ea68c407cb2faa4`). Unlike `google-forms` — where n8n has no node and the
icon in this pack is drawn for it — n8n does ship a Google Slides node, so there was an
upstream mark to port and no exception is needed.

---

Researched and endpoint-verified 2026-08-03 against the live discovery document
(`https://slides.googleapis.com/$discovery/rest?version=v1`, revision `20260729`), the
reference pages under `developers.google.com/workspace/slides`, and the usage-limits page.
Status surfaces move; re-check with `_tools/audit.ts` conventions in mind if a probe starts
failing for everyone at once.
