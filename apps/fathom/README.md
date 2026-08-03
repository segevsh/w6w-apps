# Fathom

Read Fathom meeting recordings, transcripts, summaries, action items and downloads, list teams and
users, and manage webhooks via the Fathom External API.

- **Categories** — ai, productivity, video
- **Auth methods** — api-key
- **Actions** — 11
- **Egress allowlist** — `api.fathom.ai`

> ## ⚠ This is Fathom the meeting assistant, not Fathom Analytics
>
> Two unrelated products share the name:
>
> | | Product | Domain | What it is |
> | --- | --- | --- | --- |
> | **This app** | Fathom | `fathom.video` / `fathom.ai` | AI meeting notetaker — joins Zoom, Google Meet, Microsoft Teams and Slack huddles and produces transcripts, summaries and action items. API at `api.fathom.ai/external/v1`, authenticated with `X-Api-Key`. |
> | **Not this app** | Fathom Analytics | `usefathom.com` | Privacy-focused, cookie-free web analytics. Separate company, separate API (`api.usefathom.com/v1`), separate auth (`Authorization: Bearer`). |
>
> Every endpoint, header and enum below was read off the **fathom.video** product's own OpenAPI
> document. If you are looking for pageview analytics, this is the wrong app.

## Links

- **Website** — https://www.fathom.ai (the product also lives at https://fathom.video)
- **Developer docs** — https://developers.fathom.ai
- **API overview / rate limits** — https://developers.fathom.ai/api-overview
- **Quickstart (base URL + auth header)** — https://developers.fathom.ai/quickstart
- **OpenAPI document** — https://developers.fathom.ai/api-reference/openapi.yaml — the authoritative
  source this app was built against; every path, parameter name, enum value and response field below
  was read off that file on 2026-08-03, not from memory
- **Webhooks (incl. signature verification)** — https://developers.fathom.ai/webhooks
- **OAuth (partner apps)** — https://developers.fathom.ai/oauth
- **Status page** — https://status.fathom.video
- **GitHub** — Fathom publishes no public SDK source org; its TypeScript (`fathom-typescript`) and
  Python (`fathom-python`) SDKs are documented at https://developers.fathom.ai/sdks. No GitHub
  organisation was used as a source, so none is cited.

## How big is this API, really?

**Small, and read-mostly — this app covers all of it.** Fathom's External API publishes exactly
**eleven operations**, and every one has an Action here. Nothing was padded to make the app look
comparable to the larger integrations in this pack, and nothing was held back.

Nine of the eleven are reads. The only two writes are creating and deleting a webhook. There is no
endpoint to create, edit, re-summarise, share or delete a recording; none to mark an action item
complete; none to start or stop the notetaker; and no whoami. That is a fact about the vendor's
surface, not a gap in this app.

## Actions

| Resource     | Action                     | Endpoint                                                |
| ------------ | -------------------------- | ------------------------------------------------------- |
| meeting      | Get Many Meetings          | `GET /meetings`                                         |
| meeting-type | Get Many Meeting Types     | `GET /meeting_types`                                    |
| recording    | Get Recording Summary      | `GET /recordings/{recording_id}/summary`                |
| recording    | Get Recording Transcript   | `GET /recordings/{recording_id}/transcript`             |
| recording    | Request Recording Download | `POST /recordings/{recording_id}/download`              |
| recording    | Get Recording Download     | `GET /recordings/{recording_id}/downloads/{download_id}` |
| team         | Get Many Teams             | `GET /teams`                                            |
| team-member  | Get Many Team Members      | `GET /team_members`                                     |
| user         | Get Many Users             | `GET /users`                                            |
| webhook      | Create Webhook             | `POST /webhooks`                                        |
| webhook      | Delete Webhook             | `DELETE /webhooks/{id}`                                 |

**Deliberately absent:**

- **A Trigger for the inbound webhook.** _Create Webhook_ and _Delete Webhook_ are here because they
  are real endpoints. Modelling Fathom's "new meeting content ready" delivery as a
  `TriggerDefinition` is separate work — it needs `onSubscribe` / `handleIngest` plus the
  `webhook-id` / `webhook-timestamp` / `webhook-signature` HMAC verification Fathom documents — and
  is not attempted here.
- **OAuth2.** See [Auth](#auth) below. The token endpoint is published; the **authorization**
  endpoint is not, and app credentials require partner review.
- **A list-webhooks endpoint.** There isn't one. Webhook ids come from the create response, or from
  the API Access section of Fathom's settings, where API-created webhooks also appear.
- **Everything else** listed under "How big is this API, really?" — those endpoints do not exist.

### Working with meetings and recordings

The usual sequence is _Get Many Meetings_ → take `recording_id` off a meeting → _Get Recording
Summary_ / _Get Recording Transcript_.

_Get Many Meetings_ can inline the transcript, summary, action items, highlights and CRM matches via
its `include_*` flags, which saves a round trip — but two caveats, both the vendor's:

- `include_summary` and `include_transcript` make the call a **heavy** request (30 per 60s, dropping
  to 5 during elevated activity) rather than a normal one (60 per 60s). Leave them off when paging
  through a backlog.
- Fathom documents both flags as **unavailable to OAuth-connected apps**, which must use the
  `/recordings/…` endpoints instead. This app uses an API key, so both work today; a workflow meant
  to survive a future OAuth connection should prefer the per-recording actions.

_Get Recording Summary_, _Get Recording Transcript_ and _Request Recording Download_ each have two
modes. Omit `destinationUrl` and the payload comes back inline (the useful mode in a workflow step,
and the default here); set it and Fathom POSTs the payload to that URL and the action returns only
`{ destination_url }`.

Downloads are asynchronous: _Request Recording Download_ answers **202** with a `download_id`, then
_Get Recording Download_ polls it until `status` is `completed` and the payload carries a short-lived
signed `url`. Audio-only recordings may complete immediately. A download is private to the API
client that created it, its URL expires roughly 24 hours after generation, and limited-access shares
get `403`.

### Pagination

Cursor only — no offset, no page size:

```json
{ "limit": 10, "next_cursor": "eyJwYWdlX251bSI6Mn0=", "items": [ … ] }
```

`next_cursor` is `null` on the last page; feed it back as the `cursor` param to get the next one.
`limit` is reported by the server, not chosen by the caller. All five list actions return
`{ items, nextCursor, limit }`.

The recording endpoints are unwrapped (`{ summary: … }`, `{ transcript: [ … ] }`, a download object),
and `DELETE /webhooks/{id}` answers 204 with no body at all.

### Array filters

`recorded_by`, `teams` and `calendar_invitees_domains` are repeated-parameter arrays whose name
carries the brackets — `recorded_by[]=ceo@acme.com&recorded_by[]=pm@acme.com`. `lib/client.ts`
appends the `[]` itself, so Actions pass plain keys.

## Auth

**API Key** only, sent as a header.

```
X-Api-Key: {apiKey}
```

Fathom's OpenAPI document declares exactly one API-key scheme —
`ApiKeyAuth: { type: apiKey, in: header, name: X-Api-Key }` — and the quickstart's only example is
`curl https://api.fathom.ai/external/v1/meetings -H "X-Api-Key: YOUR_API_KEY"`. There is no
query-param form and no per-account or regional host: one server,
`https://api.fathom.ai/external/v1`. Mint a key under **Fathom → Settings → API Access**.

### Why OAuth2 is not implemented

Fathom does support OAuth2 — the spec declares a `BearerAuth` scheme and the SDK docs publish the
token endpoint (`POST https://api.fathom.ai/external/v1/oauth2/token`, scope `public_api`). It is
deliberately left out, for two reasons that are facts about the vendor's docs rather than
preferences:

1. **The authorization URL is not published.** Fathom's own SDKs generate it inside
   `Fathom.getAuthorizationUrl(...)`; neither the OpenAPI document nor any docs page states the
   endpoint. A w6w `oauth2` AuthDefinition requires `authorizationUrl`, and guessing one would be
   inventing an API.
2. **It is gated on partner review.** OAuth credentials come from registering a marketplace
   application, which Fathom reviews before approving.

A `bearer` method taking a pre-obtained access token was considered and rejected: Fathom's docs state
those tokens are short-lived and each refresh token is single-use, so a stored one would go stale
within the hour.

### No connection label

Fathom publishes no whoami endpoint. There is no `/me`, and `GET /users` is **account-admin-only**
(403 for an ordinary member), so it cannot stand in for one. Rather than label a Connection from the
recorder of whatever meeting happens to be most recent, the app declares no `afterConnect` and no
`connectionLabel`.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left.

### Is the vendor up?

**Service status** — Atlassian Statuspage.

```
GET https://status.fathom.video/api/v2/summary.json
```

The `service` check reads the `summary.json` rollup: `status.indicator`
(`none` / `minor` / `major` / `critical`) plus the per-component breakdown, so one probe reports each
component rather than a single platform-wide boolean. It is unauthenticated and unsigned —
`status.fathom.video` is widened onto that hook's own allowlist and is deliberately absent from the
app's egress list, so no Action can reach it.

**The status page was verified real, not assumed.** `status.fathom.video` answers with an
`x-statuspage-version` header and `<title>Fathom Video Status</title>`; `/api/v2/summary.json`
returns JSON whose `page.name` is "Fathom Video" (page id `h4b8ylf20013`), with components including
"In-Call Processing (Zoom)" and "Google Calendar Sync". A deliberately bogus sibling path,
`/api/v2/nonsense-zzz.json`, answers **404 with an empty body** rather than the same payload — so
this is a genuine Statuspage API, not an HTML catch-all masquerading as one. Checked live
2026-08-03.

A feed-backed check was considered — Statuspage also publishes `/history.atom` — and rejected: the
JSON API states current component state directly, whereas an incident feed is a log of updates that
has to be folded back into a present-tense verdict. Where the vendor answers the question outright,
ask it outright.

### Is this credential live?

This is what the Auth `test` hook does.

```
GET /meetings
```

Fathom API keys carry no per-resource scopes, but they **do** carry account role: `/users` is
`account_admin`-only and answers 403 for an ordinary member, so probing it would report a perfectly
good credential as broken. `/meetings` is the call Fathom's own quickstart uses to demonstrate a
working key, and the call its OAuth walkthrough uses to "test the connection". No `include_*` flag is
set, so the probe stays on the cheap global rate-limit bucket.

### Do we have quota left?

**Real probe, with a caveat stated up front.** Fathom publishes **no quota or usage endpoint**, so
the reading is lifted off the response headers of a real call:

```
GET /meetings
→ RateLimit-Limit: 60 · RateLimit-Remaining: 42 · RateLimit-Reset: 17
```

Fathom's documented headers, verbatim from its rate-limiting docs:

| Header                | Meaning                                                       |
| --------------------- | ------------------------------------------------------------- |
| `RateLimit-Limit`     | Maximum requests allowed in a time window                     |
| `RateLimit-Remaining` | Requests remaining in the current window                      |
| `RateLimit-Reset`     | **Time remaining** in the current window                      |
| `Retry-After`         | Seconds to wait before retrying — sent only on a 429 response |

`RateLimit-Reset` is read as seconds-remaining (the docs' own wording, and the IETF RateLimit-header
semantics) and turned into an absolute `resetAt`.

**The caveat:** the docs hedge with "endpoints subject to rate limits *may* return the headers
below", and this app was written without a live Fathom key, so the headers' presence on `/meetings`
specifically is **unverified**. The hook therefore reports `unknown` with an explicit message when
they are absent rather than inventing a number. A 429 is read as a genuine, temporary `down`, because
in that case Fathom has said outright that there is no headroom left.

Fathom's published ceilings, for reference:

| Bucket             | Limit                                                      | What counts                                                                                   |
| ------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Global             | 60 per 60s                                                 | Everything authenticated, including polling a download's status                                |
| Heavy              | 30 per 60s (down to **5** during periods of high activity) | The recording summary and transcript endpoints; `/meetings` with `include_summary`/`include_transcript` |
| Recording download | 30 per 60s                                                 | `POST /recordings/{id}/download`                                                               |
| OAuth token        | 60 per 60s per app                                         | The `oauth2/token` endpoint (not used by this app)                                             |

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md):

| Key            | Kind       | Scope      | Credential | Severity      | Min interval | Probe                                                |
| -------------- | ---------- | ---------- | ---------- | ------------- | ------------ | ---------------------------------------------------- |
| `service`      | service    | app        | none       | degraded      | 60s          | `health/service.ts`                                  |
| `quota`        | quota      | connection | signed     | informational | 300s         | `health/quota.ts`                                    |
| `auth:api-key` | credential | connection | signed     | fatal         | —            | derived from the `api-key` auth method's `test` hook |

The host `status.fathom.video` (for `service`) is reachable **only inside that hook's worker** — not
from any action, and not from the other checks. The spec allows the widening precisely because the
check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host. `quota` declares no extra host of its own: `api.fathom.ai`
is already on the app's allowlist, which is what makes signing that probe safe.

---

Researched and endpoint-verified 2026-08-03 against Fathom's own OpenAPI document at
https://developers.fathom.ai/api-reference/openapi.yaml (`info.title: "Fathom External API"`) — every
path, query-parameter name, enum value, response field and status code above was read off that file
— plus https://developers.fathom.ai/api-overview (rate limits and headers),
https://developers.fathom.ai/quickstart (base URL and `X-Api-Key`),
https://developers.fathom.ai/webhooks and https://developers.fathom.ai/sdks/oauth. The status page
was confirmed live against `status.fathom.video/api/v2/summary.json` and negative-tested against a
bogus sibling path. **Not verified:** anything requiring a live API key — no request was ever made to
`api.fathom.ai` with real credentials, so response bodies and rate-limit headers are taken from the
vendor's schema and prose rather than from observation.

The icon is Fathom's own logomark, copied verbatim from the vendor's site
(`cdn.prod.website-files.com/…/68e7961ff28d093095bdf392_logotype-new.svg`, the mark used on
fathom.ai).
