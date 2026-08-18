# Resend

Send transactional email and manage domains, audiences, contacts and broadcasts
via Resend.

- **Categories** — email, communication
- **Auth methods** — api-key
- **Actions** — 24
- **Egress allowlist** — `api.resend.com`
- **Website** — https://resend.com
- **API docs** — https://resend.com/docs/api-reference/introduction ·
  schema: https://resend.com/openapi.json

## Setup

### API Key

1. In Resend, go to **API Keys** and create a key.
2. Paste it into the connection's **API Key** field. It is sent as
   `Authorization: Bearer re_…`.

Resend keys carry a permission — **Full access** or **Sending access** — and can
be restricted to one domain. A sending-only key can post to `/emails` but
cannot read domains, audiences or contacts. That is why the liveness probe is
`GET /emails?limit=1`: it is inside a sending key's own scope, so a valid
sending-only key passes rather than being reported as broken.

## Actions

| Key | Type | Description |
|---|---|---|
| `email-send` | perform | Send a transactional email |
| `email-send-batch` | perform | Send up to 100 emails in one request |
| `email-get` | read | Get one email and its latest delivery event |
| `email-list` | read | List sent emails |
| `email-update` | perform | Reschedule an email that has not gone out |
| `email-cancel` | perform | Cancel a scheduled email |
| `domain-create` | perform | Add a sending domain and get its DNS records |
| `domain-list` | read | List domains and their verification status |
| `domain-get` | read | Get one domain, its status and DNS records |
| `domain-verify` | perform | Ask Resend to re-check a domain's DNS |
| `domain-update` | perform | Change tracking or TLS settings |
| `audience-create` | perform | Create a list of contacts |
| `audience-list` | read | List audiences |
| `audience-get` | read | Get one audience |
| `contact-create` | perform | Add a contact, optionally to an audience |
| `contact-list` | read | List contacts, optionally by segment |
| `contact-get` | read | Get one contact by ID or email |
| `contact-update` | perform | Change a contact or its subscription status |
| `contact-delete` | perform | Remove a contact |
| `broadcast-create` | perform | Draft a broadcast to a segment |
| `broadcast-list` | read | List broadcasts and their status |
| `broadcast-get` | read | Get one broadcast |
| `broadcast-send` | perform | Send or schedule a drafted broadcast |
| `api-key-list` | read | List API keys (secrets are never returned) |

### Idempotency is real here, and the two send actions use it

Both send endpoints accept an `Idempotency-Key` header, which Resend's schema
describes as ensuring "emails are not sent twice". `email-send` and
`email-send-batch` default that key to the step's **invocation id** — stable
across retries of the same step, different for the next one. That is what makes
their `idempotent: true` an honest claim about an irreversible side effect
rather than a wish, and a test asserts the key is actually wired up rather than
trusting the flag.

`broadcast-send` has no such key and is marked `idempotent: false`, because it
reaches a whole audience.

### Recipients: one address or many

Resend types `to`, `cc`, `bcc` and `reply_to` as `oneOf` a string or an array of
strings. The form takes one comma-separated field and sends the bare string for
a single address and the array for several — the shape Resend's own examples
use. `to` is capped at 50 by the schema (`maxItems: 50`), and exceeding it fails
locally with a message naming the field, rather than as a 422.

### Not every list paginates

`/emails`, `/domains`, `/broadcasts` and `/api-keys` take the shared
`limit`/`after`/`before` cursors and answer `{ object, has_more, data }`; `after`
takes the **id of the last item on the previous page**. `/audiences` and
`/contacts` answer `{ object, data }` with no `has_more` and no cursor
parameters at all — those actions return the response as-is instead of
pretending to page, and the shared pager stops on a missing `has_more` rather
than looping.

### Contacts are addressed by ID *or* email

Resend documents the path parameter on get/update/delete as "The Contact ID or
email address", so those actions take one field and pass it through
percent-encoded. Contact **creation** puts `audience_id` in the body — this is
the current top-level `/contacts` endpoint, not the older
`/audiences/{id}/contacts` nesting some integrations still use.

### Creating a domain does not verify it

`domain-create` returns a `records` array — the DNS entries that have to exist
first. A provisioning workflow writes those to a DNS provider, then calls
`domain-verify`. That call asks Resend to re-check and answers `{ object, id }`;
it does **not** report the verdict, so read `domain-get` afterwards and check
`status`.

### Broadcasts need a segment

Resend's schema requires `from`, `subject` **and `segment_id`** on
`POST /broadcasts`. Omitting the segment is a validation error, not "send to
everyone". Creating a broadcast does not send it — `broadcast-send` does, or a
`scheduled_at` on either call.

### No versioning, one host

Resend's API reference states there is no versioning system today ("we plan to
add versioning via calendar-based headers in the future"), and the OpenAPI
document names exactly one server, `https://api.resend.com`. So no path here
carries a version segment and the allowlist is that single host.

### List actions declare no `output` fields

Four list actions unwrap the `data` envelope and return the bare array, so there
are no top-level fields for an `output` declaration to name. The pack auditor
warns about them; the warning is the accurate signal.

### Deliberately out of scope

- **API key creation** (`POST /api-keys`). Resend shows a key's secret exactly
  once, at creation — an action that did this would write a live credential into
  the step output and the run logs. Listing keys is safe and is included.
- **Inbound email** (`/emails/receiving/*`) and **attachment download**. Both
  return message bodies and binary payloads, which belong in a trigger and a
  file surface rather than an action's JSON result.
- **Templates, automations, segments, topics, contact properties, events and
  webhooks.** Each is its own coherent surface among the document's 47 paths and
  deserves its own action set; `segment_id` is still accepted where Resend
  requires it.

## Health check

Three questions get confused with each other, so this section keeps them apart:
is the *vendor* up, is *this credential* live, and do we have *quota* left. Two
of the three are declared absences here, and both were verified before being
written off.

### Is the vendor up?

**Declared unavailable — and this one is a trap worth spelling out.**
`status.resend.com` resolves and answers **HTTP 200 on every path**, which is
exactly the shape that produces a health check that stays green through an
outage. It is a client-rendered page behind a catch-all route, not a status API.
Verified 2026-08-18 — every path returns the same ~147,643-byte HTML document,
each beginning `<!DOCTYPE html>`:

```
GET https://status.resend.com/api/v2/status.json      -> 200, 147,643 B, HTML
GET https://status.resend.com/api/v2/summary.json     -> 200, 147,643 B, HTML
GET https://status.resend.com/api/v2/components.json  -> 200, 147,643 B, HTML
GET https://status.resend.com/history.atom            -> 200, 147,686 B, HTML
GET https://status.resend.com/history.rss             -> 200, 147,643 B, HTML
GET https://status.resend.com/index.json              -> 200, 147,643 B, HTML
GET https://status.resend.com/api/status              -> 200, 147,644 B, HTML
GET https://resend.com/status                         -> 200, 147,687 B, HTML
```

The standard Atlassian Statuspage paths are in that list and none is real; the
few-byte differences are a per-deploy id inside the same shell. There is no Atom
or RSS feed either, so the spec's "declare a feed, don't parse one" escape hatch
does not apply. `health/service.ts` declares the absence rather than inventing a
probe.

### Is this credential live?

`GET /emails?limit=1` — chosen so a **sending-only** key passes. 401 and 403 get
different messages, because a rejected key and a key without permission on the
account are different fixes. Resend's own 401 body is
`{"statusCode":401,"message":"Missing API Key","name":"missing_api_key"}`,
verified live against an unauthenticated call.

### Do we have quota left?

**Declared unavailable**, checked in three places first:

- Resend's API reference states the limit as "10 requests per second per team …
  applies across all API keys associated with your team", raisable on request,
  visible on the dashboard's Settings → Usage page. It names **no response
  header**.
- The OpenAPI document declares **no response headers at all** across its 47
  paths, and **no `429`** on any operation.
- A live unauthenticated `GET /emails` returns `401` with no `ratelimit-*`
  headers.

A per-second ceiling is also the wrong shape for a periodic probe: by the time a
check reported it, the window would be over. Exhaustion surfaces as a 429 on the
next call, which the client raises with Resend's own `name` code intact.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | — | — | informational | — | declared `unavailable` — status page is a catch-all HTML route |
| `quota` | quota | — | — | informational | — | declared `unavailable` — no headroom endpoint or headers |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` method's `test` hook |

## Icon

`assets/icon.svg` — the Resend mark, from
<https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/resend.svg>, downloaded
2026-08-18.

- **344 bytes**, md5 `86ac54920486cacdb5a45ce4dc680203`,
  `<title>Resend</title>`, `viewBox="0 0 24 24"`
- black (`#000000`) is Resend's own brand colour for this mark (simple-icons
  sources it from resend.com/brand), not a monochrome fallback
- `assets/icon.dark.svg` is the same artwork reversed to white by
  `_tools/icon-legibility.ts`, since black disappears on the dark tile
- re-framed onto the pack's square canvas by `_tools/icon-normalize.ts`; the
  path data inside the nested `<svg>` is the vendor's, verbatim

---

Researched and endpoint-verified 2026-08-18 against Resend's own OpenAPI
document (v1.5.0, 47 paths), its API reference, and live probes of
`api.resend.com` and every plausible path on `status.resend.com`. Status
surfaces move; re-check if a probe starts failing for everyone at once — and if
Resend ever ships a real status API, `health/service.ts` is where it goes.
