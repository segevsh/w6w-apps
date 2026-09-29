# kvCORE

Manage contacts/leads, notes, tags, users, offices and teams in **kvCORE** — Inside Real Estate's
real-estate CRM, mid-rebrand to **BoldTrail** — over the **kvCORE Public API V2**
(`api.kvcore.com`).

- **Categories** — crm, marketing
- **Auth methods** — bearer-token
- **Actions** — 26
- **Health checks** — 2 (`service`, ~~`quota`~~) + the derived `auth:bearer-token`
- **Egress allowlist** — `api.kvcore.com` (the `service` check adds `status.insiderealestate.com` to
  its own hook allowlist, never to the app's)
- **Developer hub** — https://developer.insiderealestate.com/
- **API docs used by this app** — https://developer.insiderealestate.com/publicv2/docs/overview
- **Status page** — https://status.insiderealestate.com/

> **Everything below was verified on 2026-09-29** against the vendor's own OpenAPI 3.1 document —
> server-side rendered into every `developer.insiderealestate.com/publicv2/reference/*` page (ReadMe
> project "kvCORE Public API V2", subdomain `testire`) — plus live, unauthenticated probes against
> `api.kvcore.com` and `status.insiderealestate.com` on the same day. Nothing here came from a
> third-party integration directory or a sibling app in this pack.

## Two APIs live at this developer hub. This app deliberately targets the older, working one

`developer.insiderealestate.com` currently hosts **three** separate ReadMe projects:

| Project | Subpath | What it is |
| --- | --- | --- |
| **kvCORE Public API V2** | `/publicv2` | The API this app uses. Bearer-token auth, `api.kvcore.com`. |
| Webhooks | `/webhooks` | Not used by this app. |
| **boldtrail-api-docs** | `/` (root) | A *newer*, OAuth 2.1 API at `api.boldtrail.com` / `api-developerhub.boldtrail.com`. |

The newer `boldtrail-api-docs` project describes a real, well-specified OAuth 2.1 authorization-code
flow with PKCE — but its own **"Request access"** page states plainly:

> "This API is not yet publicly available. The beta launch is planned for Q4 2025 and will be
> accessible to partners by invite only."

That page was last updated 2026-09-28 — the day before this app was built — so as of this writing
there is **no self-serve way to register a client or obtain a credential** for it. The V2 API this
app targets instead is explicit, in its own "Request Access" guide, that OAuth was available for V2
"in some specific requests, but at this time is paused" — so V2's bearer token is the only live,
self-serve auth path across either API today. If the OAuth API opens up for self-serve registration,
a follow-up app (or a new auth method on this one) can add it; guessing at its client-registration
flow now would ship something unusable.

## Auth — a self-issued bearer token, not OAuth

Any kvCORE user generates their own token from **Lead Engine → Lead Dropbox → My API Tokens**, no
partner approval required, in one of three scopes:

| Scope | Grants |
| --- | --- |
| `All` | Every public endpoint this app uses. |
| `Contacts` | Read, create and update contacts (the `contact-*` actions). |
| `Users` | Read the token owner's own user profile only. |

The token is a JWT; `sign` (`auth/bearer-token.ts`) stamps `Authorization: Bearer <token>` and never
otherwise inspects it — this app does not decode or trust any JWT claim.

**One fixed host, not per-account.** The OpenAPI document declares exactly one server,
`https://api.kvcore.com`, for every one of its ~50 documented paths, and a live, unauthenticated
`GET /v2/public/users` against that exact host answers a real `401` with
`{"errors":["Authentication Failed"]}` — not a DNS failure — confirming the host serves this API for
any brokerage's account. There is no per-tenant subdomain to express as a connection field, unlike
this pack's `mautic`/`tableau`/`bubble`/`gitea` apps.

### The one scope gap this app cannot paper over

A kvCORE bearer token's three scopes are independent, and **no documented endpoint is reachable by
every one of them** — there is no unscoped "whoami". This app's own health probe
(`auth/bearer-token.ts`, `PROBE_PATH`) reads `GET /contacts?limit=1`, matching this app's own
contact-and-account-management action surface. A `Users`-only token — which the vendor's docs say can
pull only "your user profile" — will fail that probe with `403` even though it may be a perfectly
live credential for its own narrower scope. The probe's `403` branch says this explicitly rather than
reporting a flat "invalid credential", and it is called out here rather than silently guessed around.

## Actions (26)

**Contacts** (`contact-*`) — `create`, `get`, `list` (search by email/name/source/lead
type/registration window/status/assigned agent/hashtags), `update`, `tags-add`, `tags-remove`,
`note-add`. kvCORE's own Contact Management guide is explicit that duplicates are allowed and not
de-duplicated server-side — **"Search then Create"** — so `contact-create` is not marked idempotent,
and `contact-list` exists precisely so a workflow can search first.

**Users** (`user-*`) — `create`, `get`, `list` (filter by office/lender/team/status/MLS ID/updated
window), `update`, `delete` (with optional lead-reassignment to an agent or entity).

**Offices** (`office-*`) — `create`, `get`, `list`, `update`, `delete`, `user-add`, `user-remove`.

**Teams** (`team-*`) — `create`, `get`, `list`, `update`, `delete`, `user-add`, `user-remove`. Two
asymmetries with the office equivalents, both pinned by the vendor's schema and by a test: office
create/update carry `about_alt_french` and `docusign_office_id`, which teams do not have; and the
vendor requires `name` on **team** update, but not on office update.

### What was deliberately left out

- **Super-account endpoints** (`/superaccount/*` — scheduled-email sync, cross-account transfer,
  bulk archive/delete). The vendor's own guide states these need a **super-scoped token that cannot
  be self-issued via Lead Dropbox** — only Inside Real Estate can mint one, on request. Every action
  in this app works with a self-serve token, so these were left out rather than shipped unreachable.
- **`office-user-update` / `team-user-add`'s PUT sibling** (updating an existing office/team member's
  `is_admin`/`is_primary` flags in place, distinct from adding one). Documented, but left out to keep
  this app's first cut to the recipes the vendor's own Account/User Management guides actually walk
  through; `office-user-add`/`team-user-add` already cover onboarding a member with the right flags
  set from the start.
- **Manual listings, transactions, testimonials, websites, market reports, search alerts, scheduled
  calls/appointments, and the `/v2/public/views` catalog.** All real, documented V2 endpoints outside
  this app's first-cut scope (contact + account management) — a natural follow-up, not a gap in what
  was checked.
- **The OAuth 2.1 `api.boldtrail.com` API entirely** — see above.

## Health checks

| Check | Kind | Source | Notes |
| --- | --- | --- | --- |
| `service` | service | [status.insiderealestate.com](https://status.insiderealestate.com/api/v2/summary.json) (Statuspage) | Scoped to the **"kvCORE API"** component (id `c2wp8qycvr3p`) specifically, not the page-level roll-up or the separate "kvCORE CRM" product component — an outage in an unrelated Inside Real Estate product (e.g. "CORE Listing Machine") never marks this API down. |
| `quota` | quota | — | **Declared unavailable, `informational`.** The vendor's OpenAPI document names no rate-limit header or quota endpoint anywhere across its ~50 paths, and a live `401` response carries no `X-RateLimit-*` (or equivalent) header among the ones it does send. |
| `auth:bearer-token` | credential (derived) | `GET /v2/public/contacts?limit=1` | See "The one scope gap this app cannot paper over" above. |

### The status page, verified rather than assumed

`status.insiderealestate.com` is a real, claimed Atlassian Statuspage — `insiderealestate.statuspage.io`
answers the byte-identical 6,686-byte document, and `page.name` is "Inside Real Estate" with 18
components covering the real product line (BoldTrail CRM, kvCORE CRM, kvCORE Mobile Apps, Websites,
BrokerSumo, CORE Listing Machine, IDX and Listings, …). One component is literally named
**"kvCORE API"** — the exact granularity this check needed, so no page-level or "kvCORE CRM"-level
approximation was necessary.

## Error handling

Every failure observed carries `{"errors": ...}`, but the value's shape varies: a flat array of
messages (`{"errors":["Authentication Failed"]}`, confirmed live) or a Laravel-style per-field
validation map (`{"errors":{"email":["The email has already been taken."]}}`, per the vendor's own
docs). `flattenKvCoreErrors` (`lib/client.ts`) reads both without guessing which one a given status
implies, and every action surfaces the vendor's own message rather than a bare HTTP status.

## Booleans on the wire

The vendor's API Standards guide says a boolean "accepts `true`/`1` and `false`/`0`", but every
worked example in its own guides sends the integer — so this app follows the examples: every documented
boolean field (`status`, `visibility`, `email_optin`, `is_admin`, …) is sent as `1`/`0`, converted from
the UI's native `boolean` param type in `lib/params.ts` (`contactBody`/`entityBody`/`userBody`).

## Icon

`assets/icon.png` is the developer hub's own favicon
(`https://developer.insiderealestate.com/favicon.ico`, PNG despite the `.ico` extension, 1,169 bytes,
32×32 RGBA), downloaded verbatim and never redrawn or resampled — pinned byte-for-byte in
`tests/index.test.ts`. Every icon path on the marketing domains (`insiderealestate.com`, `kvcore.com`,
apex and `www`) answers a fake `200` zero-byte image; none of those was used.
