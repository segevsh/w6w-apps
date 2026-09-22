# HeyReach

Run **HeyReach** LinkedIn outreach from a workflow: leads, lead/company lists, campaigns and
their sequences, sender LinkedIn accounts, inbox conversations, workspace statistics, webhooks,
and the blacklist that keeps leads out of every campaign.

- **Categories** — marketing, social-media, crm
- **Auth methods** — api-key (a single `X-API-KEY` header)
- **Actions** — 30
- **Health checks** — 3 (`api`, `service`, `quota`) + the derived `auth:api-key`
- **Egress allowlist** — `api.heyreach.io` only. The `service` check is a declared absence with
  no hook, so nothing else is ever reached from this app.
- **Website** — https://www.heyreach.io/
- **API docs** — https://docs.heyreach.io/

> **Verified against HeyReach's own sources on 2026-09-22** — the OpenAPI 3.1 document at
> `https://docs.heyreach.io/openapi.json` (`openapi.info.title` = "HeyReach API", 87 paths,
> 256,166 bytes, fetched and read in full), plus live probes against `https://api.heyreach.io`
> and `https://status.heyreach.io`. Nothing here came from a third-party integration directory,
> a sibling app, or the vendor's marketing pages.

## Auth

HeyReach declares **no `securityScheme` at all**: each of its 87 operations lists `X-API-KEY` as
an ordinary header parameter ("API key header using this scheme. Example: `X-API-KEY:
{API_KEY}`"). There is no bearer form, no OAuth, no HMAC and no signing beyond that one static
header, so `auth/api-key.ts`'s `sign` hook stamps `X-API-KEY` and returns. The key never appears
in a URL or a body. Keys are issued in HeyReach under **Settings > API**.

**A 401 here is two different answers, and the status code cannot tell them apart.** Verified
live on 2026-09-22 against `GET /api/public/auth/CheckApiKey`:

| request | status | body | content-type |
| --- | --- | --- | --- |
| no `X-API-KEY` at all | 401 | `Missing API key` | *(none)* |
| `X-API-KEY: bogus-…` | 401 | `Invalid API key` | *(none)* |

Both are **plain text** — the document's `UnauthorizedErrorBody` JSON schema (`type`, `title`,
`status`, `detail`, …) is fiction, and no `content-type` header is sent at all. So the *body
text* is the only discriminator, and `classifyAuthAnswer` in [`auth/api-key.ts`](auth/api-key.ts)
is the one place that decodes it: `Missing API key` means the credential never reached the
request (a wiring problem — reconnect), `Invalid API key` means HeyReach read a key and refused
it (paste it again, or regenerate it). `lib/client.ts` reads every error body as **text** before
trying JSON for exactly this reason.

The credential probe is `GET /api/public/auth/CheckApiKey`. It is documented as `200 Successful
response` with **no body**, and the live vendor answers it with a bare status — so there is
nothing in the answer that could echo the caller's key back, which is what makes it safe to
store as a probe result. The action does not parse the body at all: a 200 *is* the answer.

## Actions (30)

| Resource | Actions |
| --- | --- |
| Auth | Check API Key |
| LinkedIn accounts | List, Get, Get status |
| Lists | List lists, Get, Create, Add leads, Get leads |
| Leads | Get, Add tags, Get tags |
| Campaigns | List, Get, Create, Start, Pause, Resume, Add leads, Get leads, Get sequence |
| Stats | Get overall, Get overall by campaign |
| Inbox | Get conversations, Send message |
| Webhooks | Create, List, Delete |
| Blacklist | Get leads, Add leads |

Every action calls `/api/public/...` on `https://api.heyreach.io` — never the document's own
`servers[0].url`, which is the truncated, unusable string `"https://api"`.

## Pagination

**The list endpoints are `POST` and take their paging in the JSON body** — `{ offset, limit,
...filters }`. Not query parameters, which is how most of this pack's other apps page. Confirmed
per path, not generalised from one example:

- `li_account/GetAll`, `list/GetAll`, `list/GetLeadsFromList`, `lead/*`,
  `campaign/GetAll`, `campaign/GetLeadsFromCampaign`, `stats/*`, `webhooks/GetAllWebhooks` and
  `blacklist/GetLeads` all take a POST body.
- `inbox/GetConversationsV3` is **cursor**-paged instead: it returns `nextCursor` and
  `hasNextPage`, and has no `offset` at all (that is much of why V3 exists — `GetConversationsV2`
  hit a deep-paging limit, and it is superseded and deliberately not implemented here).
- The by-id reads (`li_account/GetById`, `list/GetById`, `campaign/GetById`,
  `campaign/GetCampaignSequence`) take a **query parameter**; `li_account/GetAccountStatus` and
  `webhooks/DeleteWebhook` take a **path segment** and a **query parameter** respectively. The
  split is the document's, and each action's params say which it uses.

Two consequences worth knowing before reading the actions:

- **Every request-body property is listed in `required`** — including `keyword`, which the same
  operation's own prose calls optional. That list is a generator artifact, so the actions send
  the fields the prose describes as required and omit the rest; `offset` and `limit` are always
  sent explicitly, because the body is the only place the API can read them from.
- **Three operations publish their request body as the literal `{"type":"string"}`**:
  `campaign/Create`, `campaign/GetLeadsFromCampaign` and `webhooks/CreateWebhook`. Their fields
  are taken from the operations' own `description` prose (which enumerates every one of them, and
  for `CreateWebhook` the complete `eventType` vocabulary), with the 200 schemas where they exist.
  Each of the three says so in its own doc comment.

## Health checks

- **`api`** (`kind: service`, `scope: connection`, `credential: signed`, `severity: fatal`) — the
  app's real check. It calls `GET /api/public/auth/CheckApiKey` with the connection's key and
  classifies the answer from the **body**, never the status code:
  - `200` → `ok`.
  - `401` reading `Missing API key` / `Invalid API key` → **`ok` for reachability**. HeyReach
    answered with its own schema-correct auth error, which proves the host resolves, TLS
    completes and the API is serving. Whether the credential is any good is a different question
    with a different fix, and it is answered separately by the derived `auth:api-key` check
    (projected from `auth/api-key.ts`'s `test` hook), which reports a rejected key on its own.
    Conflating the two is how "the key was rotated" gets misreported as "HeyReach is down".
  - `429` → `degraded`; `5xx` or an unreachable host → `down`; a `404` on the documented path or
    an HTML body → `degraded`; anything genuinely unclassifiable → `unknown` with the raw status
    and the first bytes of the body, never a guess in either direction.
- **`service`** (`kind: service`, `severity: informational`, `unavailable`) — a **declared
  absence**, and an unusually well-evidenced one: `status.heyreach.io` *is* real (it titles
  itself "HeyReach Status" and is CNAMEd to UptimeRobot's `psp-lb2.uptimerobot.com`), but it is
  an UptimeRobot page with no published contract. Every Statuspage-shaped path —
  `/api/v2/summary.json`, `/summary.json`, `/index.json`, `/history.rss`, `/feed.rss` — answers
  **404 with HTML**, and the only JSON routes
  (`/api/getMonitorList/{token}`, `/api/getEventFeed/{token}`) are keyed by an opaque token
  scraped out of the page's own `pspApiPath` JavaScript variable. Its content is also one coarse
  monitor, `PROD General Health`, not a per-component API status. `apps/bluesky` and
  `apps/apitemplateio` decline their UptimeRobot pages for exactly the same reason.
- **`quota`** (`kind: quota`, `severity: informational`, `unavailable`) — declared absent rather
  than omitted. HeyReach's document declares a `429` on every operation, so a limit exists, but
  it names **no rate-limit header** anywhere (zero occurrences of `X-RateLimit-*`, `RateLimit-*`
  or `Retry-After` in 256 KB of JSON) and no endpoint reports remaining allowance. Headroom can
  only be budgeted from observed 429s, which is what `lib/client.ts`'s error text says to do.

Both absences carry `severity: "informational"` on purpose: an `unavailable` entry always reports
`unknown`, and `unknown` outranks `ok` in a roll-up, so at any other severity they would pin the
app's verdict at `unknown` forever.

## What was deliberately left out, and why

HeyReach's document lists **87 paths**. This build implements the 30 above and leaves 57 out —
scope discipline, not unconfirmed detail, except where noted:

- **LinkedIn account connection and identity** (`Connect`, `ConnectWithCookies`, `SubmitPin`,
  `Reconnect`, `ReloginSalesNavigator`, `ReloginRecruiter`, `Resync`, `RemoveAccount`) — an
  interactive, credential-handling flow (cookies, PINs, LinkedIn's own 2FA) that has no business
  in a workflow step. The read-only half of the same subject *is* here: list accounts,
  `GetById`, and `GetAccountStatus`, which is what a workflow needs to find out why a sender is
  not sending.
- **Proxy management** (`GetProxyCountries`, `GetAccountProxy`, `UpdateProxy`) and
  `UpdateInboxConfiguration` — account infrastructure, not outreach.
- **Organization and workspace management** (`management/organizations/*`, all 14 paths: users,
  invitations, workspaces, linkedin-accounts, move-to-workspace, per-workspace API keys) — a
  separate administrative surface. It also mixes `Offset`/`Limit` **query** paging with the
  body-paged collections everywhere else, which is a whole convention of its own.
- **Enrichment** (`enrichment/enrich-email`, `enrichment/enrich-email/check-job/{jobId}`) — the
  async job-polling shape is a different contract from every other action here.
- **`MyNetwork/*`** (`GetMyNetworkForSender`, `IsConnection`) — a network-graph surface none of
  the outreach actions need.
- **Campaign configuration writes** (`UpdateSequence`, `UpdateSettings`, `UpdateSchedule`,
  `UpdateAccounts`, `CreateCampaignFromTemplate`, `UpdateLeadCustomFields`) — these define the
  sequence/schedule object shapes in their own reference sections. `campaign-create` accepts
  `schedule` and `sequence` as free-form `json` and points at them rather than half-implementing
  them, and `campaign-get-sequence` is implemented so a workflow can *read* the exact sequence a
  campaign runs.
- **Campaign v1 and per-lead campaign operations** (`AddLeadsToCampaign` v1 — superseded by the
  V2 this app implements — plus `StopLeadInCampaign`, `GetCampaignsForLead`,
  `AddLinkedInAccountsToCampaign`, `RemoveLinkedInAccountsFromCampaign`).
- **List maintenance beyond adding** (`DeleteLeadsFromList`, `DeleteLeadsFromListByProfileUrl`,
  `GetCompaniesFromList`, `GetListsForLead`, `UpdateLeadCustomFields`, and v1 `AddLeadsToList` —
  superseded by the V2 this app implements).
- **Tag vocabulary** (`lead/ReplaceTags`, `lead_tags/CreateTags`) — `lead-add-tags` covers the
  write path a workflow needs, including creating missing tags on the way in.
- **Inbox reads superseded or operational** (`GetConversationsV2`, superseded by the V3 this app
  implements; `GetChatroom`, a per-conversation detail read; `SetSeenStatus`).
- **Webhook reads and updates** (`GetWebhookById`, `UpdateWebhook`) — `webhook-list` returns the
  same fields for every webhook, custom headers included on request.
- **Blacklist maintenance beyond adding** (`RemoveLeads`, `GetCompanies`, `AddCompanies`,
  `RemoveCompanies`) — the *lead* blacklist read and write are here; the company blacklist is a
  parallel surface left for a follow-up.

None of the above was dropped because a request or response shape could not be confirmed: the 30
shipped actions (and only those) were each checked field by field against the document, and the
three operations whose body schema is a generator artifact are implemented from their own prose
and flagged in their doc comments.

## Notable API quirks (see file-level doc comments for the full detail)

- **The document's own server URL is wrong.** `servers[0].url` is `"https://api"`; the live host
  is `https://api.heyreach.io`, and the document's path keys arrive doubled
  (`//api/public/...`) where the live host answers on a single slash.
- **`totalCount` is typed `string`** on most list responses, and every scalar of the
  `li_account` responses is typed `string` — including `isActive` and `authIsValid`. Those are
  generator artifacts; the actions declare only the fields they can type honestly and return the
  full object either way.
- **Campaign `Pause` declares a `200` body copied from `GetAll`** (a campaign list page), while
  its own description says only "Pauses the specified campaign" and its siblings declare no body.
  The action treats it as the state change it is and returns the status.
- **`campaign/GetCampaignSequence` answers an empty 200** for a campaign with no sequence, so the
  result is `undefined` rather than an object — check before reading fields.
- **`stats/*` sends `accountIds` and `campaignIds` even when empty**, because the document says an
  empty list means "all" rather than "none".
- **`blacklist/AddLeads` answers 200 even when entries do not land.** Read `added`, `entries`
  (one row per input, correlated by `inputIndex`), `duplicates` and `validationErrors`.
- **`list/AddLeadsToListV2` and `campaign/AddLeadsToCampaignV2` report per-lead counts** and are
  upserts, which is what makes them safe to retry; the sends (`inbox/SendMessage`), the creates
  (`campaign/Create`, `list/CreateEmptyList`, `webhooks/CreateWebhook`) are explicitly not.
- **`inbox/GetConversationsV3`'s `correspondentProfile` carries no email address** (V2's three
  email keys were always null); use `lead/GetLead` for those.

## Testing

Unit tests mock `HookContext` (`ctx.fetch`, no-op `ctx.log`) via
[`tests/_helpers.ts`](tests/_helpers.ts) — no network access, no real credential. The auth
`sign` hook is tested directly, and the wire-body classification is tested against both of
HeyReach's 401 bodies. Run with `deno task test` from this directory.
