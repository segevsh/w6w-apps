# PandaDoc

Create documents from PandaDoc templates, send them for signature, track their status through the
signing lifecycle, download the signed PDF, and read the templates, contacts and webhook
subscriptions that feed those steps.

- **Categories** — documents, legal, productivity
- **Auth methods** — api-key
- **Actions** — 16
- **Egress allowlist** — `api.pandadoc.com`

## Links

- **Website** — https://www.pandadoc.com
- **API docs** — https://developers.pandadoc.com (every endpoint below was read off
  `developers.pandadoc.com/reference/<slug>`; the machine-readable index of that site is
  https://developers.pandadoc.com/llms.txt)
- **API key authentication** — https://developers.pandadoc.com/reference/api-key-authentication-process
- **OAuth 2.0 (not implemented — see below)** — https://developers.pandadoc.com/reference/authentication-process
- **Rate limits** — https://developers.pandadoc.com/reference/limits
- **Asynchronous creation, in the vendor's own words** —
  https://developers.pandadoc.com/docs/reliable-document-workflow
- **GitHub org** — https://github.com/PandaDoc (the vendor's public org; it hosts the official
  client SDKs, e.g. https://github.com/PandaDoc/pandadoc-api-python-client)
- **Status page** — https://status.pandadoc.com

## Authentication

Base URL `https://api.pandadoc.com/public/v1`. One host, no regional variants — PandaDoc offers
US and EU **data residency** (its status page even carries separate "US & Global" and "EU"
component groups), but that is where an account lives, not a second endpoint.
`api.eu.pandadoc.com`, `eu-api.pandadoc.com` and `api-eu.pandadoc.com` do not resolve.

The scheme is the unusual bit, so here it is verbatim:

```
Authorization: API-Key {{api_key}}
```

Not `Bearer`. `Bearer` is PandaDoc's OAuth2 access-token form and rejects an API key. Verified
live on 2026-08-03: `GET /public/v1/members/current` with a bogus key answers
`401 {"type":"authentication_error","detail":"Invalid key."}` — the header form parses, the key
is what is refused.

Mint a key at **Developer Dashboard → Configuration**. Two things follow from how PandaDoc scopes
keys:

- **A key inherits its owner's permissions.** It is tied to the member who generated it, so its
  capabilities follow that user's role and licence — and it is deactivated if that user is removed
  from the workspace. Most `403`s are the owner's role, not a broken key. Mint from a stable,
  service-account-style user.
- **Sandbox keys are throttled to 10 requests/minute** across every endpoint (production keys get
  the per-endpoint limits below). A Connection that is mysteriously slow or 429-ing is usually a
  sandbox key. Production keys need PandaDoc's approval.

**OAuth2 is supported by PandaDoc and deliberately not implemented here.** It targets a public
application acting on behalf of *other people's* accounts and requires registering and getting an
application approved. The API key is the right shape for a host driving one account it controls.
OAuth2 is a legitimate second auth method if a multi-tenant case turns up; it is not built on
speculation.

## The asynchronous document-status model

**This is the one thing to get right before wiring anything up.** PandaDoc creates documents
asynchronously, and a create-then-send workflow that ignores it fails *intermittently* — which is
worse than failing every time.

`document-create-from-template` returns `201` with:

```json
{
  "id": "D3okRfgHRX7NEhavcACReB",
  "status": "document.uploaded",
  "info_message": "Poll Document Status until status changes to document.draft"
}
```

`document.uploaded` is not a usable document. PandaDoc merges the template in the background; the
document only becomes sendable at `document.draft`, and `document.error` is a real terminal
outcome for a merge that fails. So the honest workflow shape is three steps, not two:

1. `document-create-from-template` → `document.uploaded`
2. `document-get-status`, in a wait/retry loop, until `document.draft`
   (PandaDoc's guidance is 3–5 seconds; treat `document.error` as fatal)
3. `document-send`

**This app does not poll on your behalf.** Sleeping inside a hook burns a worker on wall-clock
time the workflow engine already knows how to wait for properly, and it would hide a
`document.error` behind a timeout. The polling belongs in the graph, where it is visible and
retry policy applies to it.

The full documented status vocabulary:

| Status | Meaning |
|---|---|
| `document.uploaded` | Processing after creation. **Not sendable.** |
| `document.error` | Creation failed. Terminal. |
| `document.draft` | Editable and sendable. |
| `document.sent` | Sealed and sent; only recipients can change it. |
| `document.viewed` | A recipient has opened it. |
| `document.waiting_approval` / `document.approved` / `document.rejected` | Approval workflow. |
| `document.waiting_pay` / `document.paid` | Stripe payment gate. |
| `document.external_review` | Under recipient review via Suggest Edit. |
| `document.scheduled` | Draft queued to send later. |
| `document.completed` | Every recipient has finished. |
| `document.voided` / `document.declined` | Terminal. |

Two related quirks worth knowing:

- **`document-get-many` filters by a numeric status (0–14)**, not by these strings. That is
  PandaDoc's own split, not a translation this app invented, so the list action takes a number and
  documents the mapping in its hint. It is a plain number rather than a `select` because PandaDoc
  has extended the range over time.
- **`document-change-status` accepts only four numeric targets** — 2 Completed, 10 Paid, 11
  Expired, 12 Declined — and enforces a transition matrix, answering `409` for a move it does not
  allow. `423` on any write means someone has the document open in the editor.

## The binary download

`document-download` (`GET /public/v1/documents/{id}/download`) is the one endpoint in this app
that does not answer JSON: PandaDoc documents a `200` of `application/pdf`, `"format": "binary"`,
and with `separate_files=true` a zip archive of PDFs instead.

That **is** representable here, but only one way, and the constraint is worth being explicit
about. `ctx.fetch` returns a real `Response`, so reading the bytes is fine. The limit is the
*output* contract: an Action's return value has to survive JSON serialization to cross the worker
boundary into a workflow variable, and `OutputField.type` has no blob or file member (`string |
number | boolean | object | array`). So the bytes are base64-encoded into a string, with the
transport `content-type` reported alongside so a consumer can tell a PDF from a zip:

```json
{ "content": "JVBERi0xLjQ…", "encoding": "base64", "contentType": "application/pdf" }
```

This is the same shape `box/actions/download-file.ts` and `dropbox/actions/download-file.ts`
already use in this pack, deliberately — inventing a second convention for the same problem would
be worse than a consistent one. Two honest caveats, both consequences of the encoding rather than
defects: base64 costs ~33% on top of the file and the whole thing lives in memory and then in a
workflow variable (fine for a signed contract, not a way to move large archives); and PandaDoc
buckets this route at **100 req/min**, the tightest limit of anything this app calls.

PandaDoc's second binary route, **Download Completed Document**
(`/documents/{id}/download-protected`), is not exposed: it returns the same bytes but only for
completed documents, so it would be a second way to say the same thing.

## Actions

| Key | Type | Endpoint |
|---|---|---|
| `document-get-many` | search | `GET /documents` |
| `document-get-status` | read | `GET /documents/{id}` |
| `document-get` | read | `GET /documents/{id}/details` |
| `document-create-from-template` | perform | `POST /documents` |
| `document-send` | perform | `POST /documents/{id}/send` |
| `document-create-session` | perform | `POST /documents/{id}/session` |
| `document-change-status` | perform | `PATCH /documents/{id}/status` |
| `document-send-reminder` | perform | `POST /documents/{document_id}/send-reminder` |
| `document-download` | read | `GET /documents/{id}/download` |
| `document-delete` | perform | `DELETE /documents/{id}` |
| `template-get-many` | search | `GET /templates` |
| `template-get` | read | `GET /templates/{id}/details` |
| `contact-get-many` | search | `GET /contacts` |
| `contact-create` | perform | `POST /contacts` |
| `webhook-subscription-get-many` | search | `GET /webhook-subscriptions` |
| `member-get-current` | read | `GET /members/current` |

Notes that are easy to get wrong:

- **`document-get-status` and `document-get` are different routes**, not two spellings of one.
  The status route is small and sits in PandaDoc's 2000 req/min bucket; Document Details is heavy
  and sits in the 600 bucket. Poll the former.
- **`template-get` before `document-create-from-template`.** The template's `roles` are what
  `recipients[].role` must match, and its `tokens` and `fields` name what you can fill. Guessing
  those is the second most common way a create call fails.
- **`webhook-subscription-get-many` answers `{ "items": [...] }`**, where every other collection
  in this app answers `{ "results": [...] }`. The vendor's inconsistency, reflected faithfully.
- **`contact-get-many`'s `email` filter is an exact match, not a search** — which makes it the
  "does this contact exist?" lookup before `contact-create`, since PandaDoc has no upsert and will
  happily create a duplicate.
- **`member-get-current`'s `membership_id`** is the value `document-create-from-template`'s
  `owner` and `document-send`'s `sender` take when acting on another member's behalf.

### Deliberately absent

- **Webhook subscription writes** (create / update / delete, shared-key rotation) — registering a
  callback URL is a Trigger's `onSubscribe`, not an Action. An Action that registers a URL the
  workflow engine did not mint leaves an orphan subscription pointing at nothing. Listing them is
  kept, because that is a genuine read and it is how you find the `shared_key` a verifier needs.
- **Document creation from a file upload or a public PDF URL** — the multipart route needs a body
  shape a JSON param list cannot express, and both bypass the template model the rest of this app
  composes around.
- **Document authoring internals** — sections, attachments, document fields, content-library
  items, quotes, catalog items. These edit the *inside* of a document, which is what PandaDoc's
  editor is for; this app runs documents through a workflow rather than composing them.
- **Workspace and user administration** (workspaces, users, members, API-key minting) and
  **notarization** — operator concerns, and minting API keys from inside a workflow is a
  credential-management anti-pattern.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left.

### Is the vendor up?

**`status.pandadoc.com`** — a genuine Atlassian Statuspage (page id `gcs4ryzm3qt6`, name
"PandaDoc"), probed at `/api/v2/summary.json` for the rollup indicator plus per-component detail
in one request.

**That it is genuine was checked against a deliberate control, not assumed.** A Statuspage-shaped
URL is not evidence of a Statuspage: some vendors serve an HTML catch-all for every unknown path,
so `/api/v2/summary.json` "works" and returns something byte-identical to what a nonsense path
returns. Verified live 2026-08-03:

```
GET status.pandadoc.com/api/v2/summary.json                  -> 200 application/json, 23210 bytes
GET status.pandadoc.com/api/v2/nonsense-does-not-exist.json  -> 404, 0 bytes
```

Different status, different content type, different size. Real page.

**Components are namespaced by their group**, which is a departure from most apps in this pack and
is load-bearing here. PandaDoc's page splits into two component *groups*, "US & Global" and "EU",
each carrying the **same** component names (Creating and editing documents, Sending documents,
Uploading documents, Public (recipient) view, Signup, CRMs & Integrations, API, Webhooks, Web
application, Mobile application, Website, Downloading documents). Slugging by bare name — the
usual approach — would collapse each pair into one key and let whichever region came last silently
win, so an EU outage could be reported as "operational". Each leaf is therefore reported as
`<group>/<component>` (`us-global/api`, `eu/api`); an ungrouped component keeps its bare slug.
Data residency means an account lives in exactly one region and PandaDoc gives the API no way to
say which, so both are reported and the rollup indicator carries the verdict.

`status.pandadoc.com` stays **off** the app's egress allowlist — an action has no business calling
it. The check widens egress for its own worker only, which is safe precisely because the probe is
never signed. A status page that itself fails reports `unknown`, never `down`.

### Is this credential live?

The Auth `test` hook — the app's own check, and the only one of the three it performs itself.

```
GET /public/v1/members/current
```

The narrowest useful probe available: it needs no document, template or contact to exist, and no
permission beyond being a member (every licence tier, down to Guest, can read its own membership).
A read on `/documents` would also work but can `403` on a role that cannot list other people's
documents — which would report a working credential as broken.

### Do we have quota left?

**Nothing to read.** PandaDoc's limits are real, published and *per-endpoint-family* rather than a
single account budget — a sliding 60-second window measured in requests per minute:

| Endpoint family | RPM |
|---|---|
| Create Document | 500 |
| Send Document | 400 |
| Document Details | 600 |
| List / Status / Delete | 2000 |
| Download Document | 100 |
| *Any endpoint, sandbox key* | 10 |

The buckets are explicitly not cumulative, and exceeding one answers `429`. But the reference
documents **no rate-limit response headers**, and none are sent: a live
`GET /public/v1/documents` (401) and a live `GET /public/v1/members/current` with a bogus key
(401) both come back with no `X-RateLimit-*`, no `RateLimit-*` and no `Retry-After` — only
`x-request-id`, `x-request-source`, `traceparent` and Imperva CDN headers. There is no usage or
quota endpoint anywhere in the reference either (the API-log routes report calls made, not
allowance left).

So headroom against a *per-family* limit could only be reconstructed by this app counting its own
calls per bucket — a guess about traffic from every other client sharing the key, not a reading. A
guess reported as a quota figure is worse than an honest absence, so `quota` is **declared absent**
rather than omitted: a host should be able to tell "we cannot know" from "nobody looked".

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `status.pandadoc.com/api/v2/summary.json` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:api-key` | credential | connection | signed | fatal | — | derived from the `api-key` auth method's `test` hook |

**`quota` is declared absent.** A declared absence always reports `unknown`, so it carries
`severity: "informational"` — otherwise it would pin every verdict for this app at `unknown`
forever.

## Icon

`assets/icon.svg` is PandaDoc's own square mark, copied **verbatim** from the vendor's site
(`images.ctfassets.net/…/PandaDoc-mobile.svg`, the 30×30 logo the marketing site serves on
mobile). Unmodified, including its own `<title>PandaDoc</title>`.

---

Researched and endpoint-verified 2026-08-03 against PandaDoc's official reference at
`developers.pandadoc.com/reference/*`, cross-checked live against `api.pandadoc.com` and
`status.pandadoc.com`. No endpoint or parameter in this app was inferred from a naming pattern.
Status surfaces move; re-check if a probe starts failing for everyone at once.
