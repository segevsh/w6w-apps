# Zoho Sign

Upload documents, send them out for signature, track their status, and manage reusable templates in
Zoho Sign — e-signature software.

Scoped to **Zoho Sign specifically**. This pack already ships several other Zoho products (`zoho`
for CRM, `zohobooks`, `zoho-invoice`, `zohodesk`, `zohomail`, ...) with separate API surfaces — do
not confuse Zoho Sign with them, and do not modify their app directories from here.

- **Categories** — documents, legal, productivity
- **Auth methods** — oauth2, one per Zoho data centre (see below)
- **Actions** — 12
- **Egress allowlist** — `sign.zoho.com`, `sign.zoho.eu`, `sign.zoho.in`, `sign.zoho.com.au`,
  `sign.zoho.jp`, `sign.zohocloud.ca`, `sign.zoho.sa`, `sign.zoho.uk`, `sign.zoho.sg`, `sign.zoho.ae`
- **Website** — https://www.zoho.com/sign/
- **API docs** — https://www.zoho.com/sign/api/ (a client-rendered reference; the individual
  endpoint pages below are not indexed/sitemapped and were located via the Wayback Machine's CDX
  index of that path, then fetched and verified live)

## Actions

| Resource | Actions                                                          |
| -------- | ----------------------------------------------------------------- |
| Request  | create (draft), submit (send for signature), list, get, delete, recall, remind |
| Template | list, get, create, delete, create-document (send using template)  |

Deliberately absent — either the exact endpoint was never located in Zoho's documentation, or it is
a large editor-shaped surface this app does not attempt to model generically:

- **User management** (retrieve/invite/update/delete an account user, and the `ZohoSign.account.*`
  scope family it would need). `introduction.html` names these operations but their concrete paths
  were never found under `https://www.zoho.com/sign/api/`.
- **Folder management** (`create-folder`, `get-folder-list.html` exists and was verified, but with
  no create/update path found to pair it with, listing folders alone had little standalone value).
- **Document-type / field-type administration** (`get-document-type.html`,
  `create-document-type.html` — the latter 404s; `retrieve-field-type.html`).
- **Downloads** — `download-pdf.html`, `download-particular-pdf.html`,
  `download-completion-certificate.html` are real, documented endpoints that return binary content.
  Wiring them up needs `ctx.file.create()` to hand the bytes back as a `FileRef`; left out of this
  first pass rather than shipped unverified against a real PDF response.
- **`update-document` / `update-template`** — real, documented `PUT` endpoints, but their payload is
  a full field-by-field re-placement (exact `x_coord`/`y_coord`/`abs_width`/`abs_height`/font styling
  per field) — an editor-shaped surface, not a form a workflow action should model generically.
  `request-submit`'s `actions` param is deliberately raw pass-through JSON for the same reason.
- **Signer groups** (`signergroups/list.html` was found and verified, but create/update/delete paths
  for a group were not).
- **Aadhaar eSign / e-stamping** (`estamping.html` exists but is India-specific, regulatory, and out
  of scope for generic workflow automation).

`request-submit`'s and `template-create-document`'s `actions`/`fieldData` params take raw JSON
matching Zoho's own documented shape rather than a fixed param per field — the full field-placement
schema runs to a dozen-plus optional keys per field (coordinates, font styling, per-type sub-shapes
for checkboxes/radio groups/dates) that would bloat every form for the common case. Each action's
hint links to the doc page its shape came from.

## Request lifecycle: create is a draft, submit is what actually sends it

Unlike some e-signature APIs that create-and-send in one call, Zoho Sign's own "Getting started"
guide sends a document in two steps:

```
POST /requests            (multipart upload — creates a DRAFT, nobody notified yet)
POST /requests/{id}/submit  (application/x-www-form-urlencoded — sends it, recipients emailed)
```

`request-create` maps to the first call, `request-submit` to the second. Recipients (`actions`) are
recorded at creation time and echoed back with their `action_id`, which `request-submit` (or, for a
sequenced field-placement flow, `request-get`) then needs.

## Templates: `create-document` fills roles and can send in the same call

`template-create` uploads a document and defines recipient **roles** (`role`, not a fixed
name/email). `template-create-document` (`POST /templates/{id}/createdocument`) later fills those
roles with real recipients and, when `isQuickSend` is true (the default), sends the result for
signature in the same call — no separate `request-submit` needed for the template path.

That endpoint's request body is unusual: `is_quicksend` travels as its own top-level
`application/x-www-form-urlencoded` field, a sibling to `data`, not nested inside it — easy to miss
if you assume every write endpoint here shares one body shape (three different encodings are in play
across this app — see "Three request encodings" below).

## Regional data centres (all ten)

Zoho Sign supports **ten** regional data centres — United States, Europe, India, Australia, Japan,
Canada, Saudi Arabia, United Kingdom, Singapore, United Arab Emirates — two more than this pack's
`zohobooks` app (UK/Singapore/UAE; no China), each with its own API host (`sign.zoho.<tld>`) and
(almost always) its own OAuth host (`accounts.zoho.<tld>`). Verified live 2026-09-29 against
`https://www.zoho.com/sign/api/api-endpoint.html` (the "API Root Endpoint" domain table) and direct
probes of every host.

Because the OAuth host is baked into the authorization flow itself (the browser is redirected to a
specific accounts host before any in-flow field could be read), a single `oauth2` auth method with a
"data centre" selector cannot express this — RFC `auth.md`'s `oauth2.authorizationUrl` / `tokenUrl`
are static per method. So `auth/oauth2.ts` declares **one `AuthDefinition` per data centre**
(`oauth2-us`, `oauth2-eu`, `oauth2-in`, `oauth2-au`, `oauth2-jp`, `oauth2-ca`, `oauth2-sa`,
`oauth2-uk`, `oauth2-sg`, `oauth2-ae`) — the user picks the method matching their organization's data
centre when connecting, and `w6w.network.allow` lists every corresponding API host.

**Canada is the one region where BOTH the API host and the OAuth host break the pattern the other
nine follow — not just one of them.** Zoho Sign's own domain table gives Canada's domain as
`.zohocloud.ca`, meaning the whole `zoho.<tld>` segment is replaced, not just the TLD appended after
it. Probed live:

```
sign.zoho.ca          -> connection fails entirely (no such host)
accounts.zoho.ca      -> connection fails entirely (no such host)
sign.zohocloud.ca     -> 401 {"code":9031,"message":"Ticket invalid","status":"failure"}
accounts.zohocloud.ca -> 302 (a real redirect to the Zoho login page)
```

Assuming the nine-of-ten pattern holds for Canada breaks **both** halves of the OAuth flow for
exactly that one region — a stricter version of the single-host quirk this pack's `zohobooks` /
`zohomail` apps document for their own Canadian entries.

All ten `sign.zoho.<tld>/api/v1/templates` endpoints (and `sign.zohocloud.ca`) were probed
unauthenticated on 2026-09-29 and every one answered the documented shape — `401
{"code":9031,"message":"Ticket invalid","status":"failure"}` — not a catch-all 200 or a generic 404.
Every `accounts.zoho.<tld>/oauth/v2/auth` (and `accounts.zohocloud.ca`) answered `302` for a
syntactically valid authorize request.

Each `oauth2-<region>` method's `afterConnect` records that region's fixed `apiHost`/`region` on the
connection unconditionally and makes no network call of its own — Zoho Sign publishes no confirmed
"whoami" endpoint for this app to enrich the connection label with further (see "Deliberately
absent" above), so `afterConnect` stays a pure recorder rather than guessing at an unverified call.

## Three request encodings, not one

Verified per endpoint rather than assumed uniform (`lib/client.ts`, `lib/multipart.ts`):

| Shape                                              | Used by                                                              |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| `multipart/form-data`, `file` + plain-text `data`   | `request-create` (`POST /requests`), `template-create` (`POST /templates`) |
| `application/x-www-form-urlencoded`, `data=<json>`  | `request-submit`, `template-create-document`, and `GET` list calls (the same JSON travels as a `data` **query** parameter there) |
| Flat multipart fields, no `data` envelope at all    | `request-delete` (`recall_inprogress`, `reason` as their own form fields) |

Assuming one shape for all of them breaks at least two of the three — confirmed against the real
`curl` examples on `document-managment/create-document.html`,
`document-managment/send-document-for-signature.html` and `document-managment/delete-document.html`
respectively.

## The response envelope's success/failure signal is `status`, not HTTP status

A successful response is `{"code": 0, "status": "success", "message": "...", "<resource>": ...}` —
the resource key varies per endpoint (`"requests"`, `"templates"`; some bodies, like recall/remind/
delete, carry none at all). An error is `{"code": <n>, "message": "...", "status": "failure"}`.
`lib/client.ts` classifies success/failure from the vendor's own `status` field, never from HTTP
status alone.

Two different bad-auth codes are told apart the same way this pack's `zohobooks` app tells its own
`14`/`57` apart:

| Request                                  | HTTP | `code` | Meaning                                      |
| ------------------------------------------ | ---- | ------ | ----------------------------------------------- |
| No `Authorization` header at all           | 401  | 9031   | No usable token reached the request              |
| `Authorization: Zoho-oauthtoken garbage`   | 401  | 9041   | A token reached the request and was rejected     |

Both confirmed live against `sign.zoho.com`.

## OAuth scopes

`oauth.html` documents `ZohoSign.documents.{CREATE,READ,UPDATE}` and
`ZohoSign.templates.{CREATE,READ,UPDATE}`. This app additionally requests
`ZohoSign.documents.DELETE` — not on that table, but it appears as a real scope in Zoho's own
"Generating grant token" request example on `getting-started.html`, and `request-delete`/
`request-recall` need *some* documents-family scope beyond `.UPDATE`. `ZohoSign.templates.DELETE` is
requested by the same CRUD-verb symmetry but is **unconfirmed** — `template-delete`'s endpoint is
documented, its required scope is not. `ZohoSign.account.*` (User Management) is not requested,
since this app implements no user-management actions.

## No quota surface exists

`api-limitations.html` documents real per-minute (mostly 50/minute) and per-endpoint (e.g. 2/minute
for exporting templates) limits, and per-request document/recipient/field ceilings — but none of
that is exposed as a *response header*. A live unauthenticated `GET /templates` (and the same call
with a bad token) carries no `X-RateLimit-*` or similarly named header at all — checked 2026-09-29.
`health/quota.ts` states this as a positive absence with `severity: "informational"` rather than
leaving a silent gap.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key                    | Kind       | Scope      | Credential | Severity      | Min interval | Probe                                                       |
| ----------------------- | ---------- | ---------- | ---------- | -------------- | ------------ | -------------------------------------------------------------- |
| `service`               | service    | app        | none       | degraded       | 300s         | `health/service.ts` (feed)                                     |
| `quota`                 | quota      | —          | —          | informational  | —            | ~~declared unavailable~~ (`health/quota.ts`)                    |
| `auth:oauth2-<region>`  | credential | connection | signed     | fatal          | —            | derived from each region's `oauth2-<region>` `test` hook (10)  |

**Service status** — Zoho's StatusIQ (Site24x7) feed, the same platform this pack's `zoho`,
`zohomail` and `zohobooks` apps read:

```
GET https://us.zohostatus.com/rss
```

Confirmed live 2026-09-29: the feed carries an entry titled exactly `"Zoho Sign - Operational"`,
distinct from the generic Zoho umbrella entries and from other products' components on the same
page.

| StatusIQ status      | Mapped state |
| --------------------- | ------------ |
| Operational           | ok           |
| Under Maintenance     | degraded     |
| Degraded Performance  | degraded     |
| Partial Outage        | degraded     |
| Major Outage          | down         |

The host `us.zohostatus.com` (for `service`) is reachable **only inside that hook's worker** — not
from any action, and not from the other checks. The spec allows the widening precisely because the
check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time.

## Findings worth a day saved

1. **Zoho Sign has its own dedicated API host, not the shared `www.zohoapis.<tld>` gateway.**
   `sign.zoho.<tld>` — the same shape as Zoho Desk's `desk.zoho.<tld>`, not Books'/CRM's. See
   `lib/client.ts`'s header comment.
2. **Canada breaks the pattern on BOTH the API host and the accounts host together**, not just the
   accounts host the way `zohobooks`/`zohomail`'s Canadian entries do. See "Regional data centres"
   above.
3. **Three different request encodings coexist in the same API** — multipart-with-plain-text-`data`
   for uploads, url-encoded-`data=` for everything else that mutates state, and flat multipart fields
   with no `data` envelope at all for delete. See "Three request encodings" above.

---

Researched and endpoint-verified 2026-09-29 against `https://www.zoho.com/sign/api/` — the
individual pages (`api-endpoint.html`, `oauth.html`, `getting-started.html`,
`getting-started-with-zoho-sign-api.html`, `basic-concepts.html`, `error-codes.html`,
`api-limitations.html`, `embedded-signing.html`, `document-managment/*.html`,
`template-managment*.html`, `signergroups/list.html`) located via the Wayback Machine's CDX index of
that path and fetched live — plus live probes against all ten `sign.zoho.<tld>` API hosts, their
accounts hosts, and `us.zohostatus.com`. Status surfaces move; re-check with `_tools/audit.ts`
conventions in mind if a probe starts failing for everyone at once.
