# Docusign

Send agreements for signature with the **Docusign eSignature REST API v2.1**, track them, read
what recipients filled in, and download the signed PDFs.

> **Auth:** OAuth 2.0 Authorization Code Grant · two methods — `oauth2` (production) and
> `oauth2-demo` (developer sandbox)
> **Categories:** documents, legal, productivity
> **API:** `{base_uri}/restapi/v2.1/accounts/{accountId}` — the host is **per account** and
> discovered at runtime (see below)

---

## The thing to get right first: there is no single Docusign API host

Docusign's swagger nominally says `host: www.docusign.net`. That is a placeholder. Real calls go to

```
{base_uri}/restapi/v2.1/accounts/{accountId}/...
```

where **both** `base_uri` and `accountId` belong to the specific account the token was issued for.
They are discovered by calling the *authentication* server after sign-in:

```
GET https://account.docusign.com/oauth/userinfo      (production)
GET https://account-d.docusign.com/oauth/userinfo    (developer / demo)
Authorization: Bearer {access_token}

200 {
  "sub": "…", "name": "First Last", "email": "first@example.com",
  "accounts": [
    { "account_id": "a4ec…33aa", "is_default": false,
      "account_name": "Example Europe Ltd", "base_uri": "https://eu.docusign.net" },
    { "account_id": "a4ec…20e1", "is_default": true,
      "account_name": "Example Corporation", "base_uri": "https://na3.docusign.net" }
  ]
}
```

A login can belong to **several** accounts, each pinned to a different region — so a hardcoded host
is wrong for most users, and wrong *silently*: a request to the wrong region answers with an
authorization error, not a redirect.

**How this app handles it.** The auth method's `afterConnect` calls `/oauth/userinfo` exactly once
and records `baseUri` + `accountId` (plus `accountName`, `environment`, `userName`, `email`) on the
Connection's `display`. Every action reads them from there via `accountContext()` in
[`lib/client.ts`](lib/client.ts) — no action ever re-derives them. That is also Docusign's own
instruction: the userinfo endpoint is rate limited per user id and per integration key, and the docs
say the response "should always be cached, at least for your application's entire session".

If a login belongs to several accounts, leave **Account ID** blank at connect time to take the
default, or paste the API Account ID GUID of the one you want. A value matching nothing fails at
connect with a list of the accounts the token actually reaches.

The live production region list — from the unauthenticated
`GET https://www.docusign.net/restapi/service_information`, checked 2026-08-03 — is `www`, `na2`,
`na3`, `na4`, `eu`, `au`, `ca`, `jp1`, all under `docusign.net`; the developer environment is
`demo.docusign.net`. Docusign adds regions over time, which is exactly why this app resolves the
host rather than listing it.

## Demo versus production: two auth methods, not a switch

Docusign's developer and production systems are separate installations — separate accounts,
separate integration keys, separate authentication host, separate API host. Nothing created in one
is visible in the other.

| | Authentication host | API host |
|---|---|---|
| **Production** (`oauth2`) | `account.docusign.com` | the regional `*.docusign.net` host for the account |
| **Developer** (`oauth2-demo`) | `account-d.docusign.com` | `demo.docusign.net` |

The obvious design — one auth method with an `environment` field — **does not work here**, and the
reason is structural rather than stylistic: `OAuth2Config.authorizationUrl` and `tokenUrl` are
static strings in this spec, and the environment has to be settled *before* the browser redirect
happens, which is before any connect-time field could be read. So the app ships two auth methods
built from one factory (`createDocusignOAuth(environment)` in [`auth/oauth2.ts`](auth/oauth2.ts));
the user picks one per Connection, and `afterConnect` stamps `environment` onto `display` so
everything downstream can tell them apart.

## `network.allow`

```json
["*.docusign.net", "account.docusign.com", "account-d.docusign.com"]
```

Per-account regional hosts mean one static hostname cannot cover the API. The pack has two
established shapes for that, and this follows the narrower one:

- **Zendesk's `*.zendesk.com`** — a wildcard under a vendor-owned apex, used when the tenant host
  varies but the apex does not. That is exactly Docusign's situation, so `*.docusign.net` it is.
- **WordPress's `"*"`** — total egress freedom, defensible there only because the endpoint is a
  *user-supplied* self-hosted URL with no vendor apex at all. Docusign has an apex, so `"*"` would
  be strictly more permission than the app needs.

The two `.docusign.com` authentication hosts are listed **exactly**, not as a wildcard — they are
the only `.docusign.com` hosts any hook touches, and they are reached by `test` and `afterConnect`
for `/oauth/userinfo`.

`assertAllowedHost()` checks a discovered `base_uri` against that apex before it is used, so a host
outside the allowlist (a government-cloud deployment, say) fails with a message naming the host and
pointing at `package.json`, rather than as an opaque sandbox egress denial.

`status.docusign.com` is deliberately **not** on this list — the health check widens egress for its
own unsigned worker only.

## Auth

Both methods are the **Confidential Authorization Code Grant**: this host stores the integration
key and secret, so it is a confidential client.

| | |
|---|---|
| Authorize | `GET {auth host}/oauth/auth?response_type=code&scope=…&client_id=…&state=…&redirect_uri=…` |
| Token / refresh | `POST {auth host}/oauth/token` — `grant_type=authorization_code` (or `refresh_token`), form-encoded, integration key + secret as HTTP Basic |
| Scopes | `signature` (required for most eSignature endpoints) + `extended` (each refresh issues a refresh token with a full ~30-day lifetime instead of inheriting the original expiry) |
| PKCE | **on** — Docusign documents PKCE as optionally available on the confidential flow, and it is strictly better |
| Revoke | **none claimed** |

`impersonation` is not requested: it belongs to the JWT Grant flow, not this one.

**Why no `revokeUrl`.** Docusign publishes `{auth host}/logout`, but that is a *browser* SSO logout
that ends a user's authentication session and takes `client_id` / `redirect_uri` / `response_mode`
query parameters. It is not an OAuth token-revocation endpoint and cannot be called server-side
with a token, so claiming it would assert a capability Docusign does not offer.

**`test`** calls `GET /oauth/userinfo` — the scope-free whoami. It is the narrowest thing a valid
token can always reach (no scope, no account id, no regional host), so it never reports a working
Connection as broken because of a missing permission. Its one cost is Docusign's hourly userinfo
cap, so a host should not poll the derived `auth:oauth2` check aggressively.

## Setup

1. Create an **integration key** (app) in Docusign — *Settings → Apps and Keys* on
   [production](https://apps.docusign.com/) or on a
   [developer account](https://developers.docusign.com/).
2. Give it a **secret key** and register this w6w installation's OAuth redirect URI, exactly.
3. Grant consent on first connect. Organization-wide use may need admin consent.
4. Connect with **OAuth (Production)** or **OAuth (Developer Sandbox)** to match the account.
   Leave *Account ID* blank unless the login reaches more than one account.

## Actions (16)

### Envelope

| Key | Type | Endpoint |
|---|---|---|
| `envelope-list` | search | `GET /envelopes` (`Envelopes: listStatusChanges`) |
| `envelope-get` | read | `GET /envelopes/{envelopeId}` |
| `envelope-status-list` | read | `PUT /envelopes/status` (`Envelopes: listStatus`, batched) |
| `envelope-create` | perform | `POST /envelopes` with inline documents + recipients |
| `envelope-create-from-template` | perform | `POST /envelopes` with `templateId` + `templateRoles` |
| `envelope-send` | perform | `PUT /envelopes/{envelopeId}` → `{"status":"sent"}` |
| `envelope-void` | perform | `PUT /envelopes/{envelopeId}` → `{"status":"voided", "voidedReason":…}` |
| `envelope-form-data-get` | read | `GET /envelopes/{envelopeId}/form_data` |

### Recipient

| Key | Type | Endpoint |
|---|---|---|
| `envelope-recipient-list` | read | `GET /envelopes/{envelopeId}/recipients` |
| `envelope-recipient-add` | perform | `POST /envelopes/{envelopeId}/recipients` |
| `recipient-view-create` | perform | `POST /envelopes/{envelopeId}/views/recipient` |

### Document

| Key | Type | Endpoint |
|---|---|---|
| `envelope-document-list` | read | `GET /envelopes/{envelopeId}/documents` |
| `envelope-document-download` | read | `GET /envelopes/{envelopeId}/documents/{documentId}` |

### Template · User

| Key | Type | Endpoint |
|---|---|---|
| `template-list` | search | `GET /templates` |
| `template-get` | read | `GET /templates/{templateId}` |
| `user-list` | search | `GET /users` |

All paths are relative to `{base_uri}/restapi/v2.1/accounts/{accountId}`.

### Notes that save an afternoon

- **Creating is sending.** There is no separate "send new envelope" endpoint. `status: "created"`
  leaves a draft; `status: "sent"` mails the recipients immediately. Both create actions default to
  `created` — an action that emails other people the moment it runs should be asked for.
- **Don't poll per envelope.** Docusign limits an app to one status GET per unique envelope per 15
  minutes, and flags repeated single-envelope polling as a rate-limit violation during app review.
  Use `envelope-status-list`, which takes a whole batch in one call. (It is a `PUT` that changes
  nothing — Docusign's design, so a long id list can travel in a body.)
- **`envelope-status-list` takes no date filters.** Docusign accepts *exactly one* of `from_date`,
  `envelope_ids` and `transaction_ids` on that endpoint; this action is the `envelope_ids` branch.
- **`from_date` on `envelope-list` is conditionally required** — Docusign requires it unless
  envelope ids are supplied. That is a rule a static `required: true` cannot express, so the param
  is optional and Docusign's own 400 comes back unmodified.
- **Download keywords.** `envelope-document-download`'s Document ID takes a real id *or* `combined`
  (all documents as one PDF), `archive` (ZIP + certificate), `certificate`, `portfolio`. The
  **Include certificate** flag only applies to `combined`. Bytes come back base64-encoded, with the
  transport content type and the `Content-Disposition` filename alongside — the same shape
  `pandadoc`, `box` and `dropbox` use, because an Action's output must survive JSON serialization
  and `OutputField.type` has no blob member. base64 costs ~33%; fine for a contract, not for large
  archives.
- **Embedded signing needs a `clientUserId` on the recipient.** `recipient-view-create` mints the
  signing URL, but only for a *captive* recipient — one created with a `clientUserId`. The URL is
  **single-use and expires in five minutes**; Docusign's own guidance is not to store or email it.
  Focus-view embedding also needs `frameAncestors` and `messageOrigins`, which go through
  *Additional fields* because their correct values depend on the host page and the environment
  (`https://apps-d.docusign.com` in demo, `https://apps.docusign.com` in production).
- **Documents, recipients and template roles are JSON.** Docusign's tab model (anchor strings,
  absolute page positions, per-type tab arrays) has no flat form representation that would not be an
  invented schema. They pass through verbatim; a malformed value fails locally naming the param
  rather than as an opaque 400.

### Deliberately absent

- **Docusign Connect (webhooks).** Registering a callback URL is a Trigger's `onSubscribe`, not an
  Action — an Action that registers a URL the workflow engine did not mint leaves an orphan
  subscription. Worth naming here because Docusign's own rate-limit guidance says to use Connect
  *instead of* polling, so this is a real gap rather than a stylistic one.
- **Envelope authoring internals** — tabs, custom fields, document visibility, attachments, locks,
  workflow steps, delayed routing. These edit the inside of an envelope, which is what Docusign's
  editor and template designer are for. What a workflow needs is reachable: tabs travel inline in
  the recipients JSON, and their filled values come back from `envelope-form-data-get`.
- **Bulk send, PowerForms, signing groups, brands, notary, payments** — product features with their
  own configuration surfaces, not workflow steps.
- **User / group / permission administration** — operator concerns. `user-list` stays because a
  `userId` is an input other actions take.
- **JWT Grant (impersonation)** — Docusign's answer for unattended service integrations and a
  legitimate third auth method, but it needs an RSA keypair, one-time admin consent, and a `sign`
  hook that mints and signs a JWT per request. Not implemented on speculation. **Implicit Grant** is
  superseded by the PKCE public flow in Docusign's own guidance.
- **CLM, Rooms, Click, Maestro, Navigator, Admin, Monitor** — separate products, separate scopes,
  separate hosts. This app is eSignature.

## Health checks

### `service` — Docusign platform status

Reads `https://status.docusign.com/api/v2/summary.json`. Unauthenticated, unsigned, app-scoped, so
it reports even before anyone has connected. `status.docusign.com` is widened for this hook only.

**The page is real, and that was checked rather than assumed.** A Statuspage-shaped URL is not
evidence of a Statuspage — several vendors serve an HTML catch-all for every unknown path. Verified
live on 2026-08-03 against a deliberate control:

```
GET status.docusign.com/api/v2/summary.json             -> 200 application/json, 19227 bytes
GET status.docusign.com/api/v2/status.json              -> 200 application/json,   216 bytes
GET status.docusign.com/api/v2/definitely-not-real.json -> 404,                       0 bytes
```

Different status, different content type, different size — a genuine Atlassian Statuspage, page id
`mwr4rgcd2g69`, name "Docusign".

**Why the verdict is the eSignature group, not the page rollup.** Docusign's page covers seven
products in component groups — eSignature, CLM, Rooms, Forms, Insight, Trusted Service Provider,
Corporate, Third Party Services — 56 components in all. The page-wide indicator therefore goes
yellow for a CLM incident or a Learning Portal outage, neither of which this app can touch. So the
reported state is the **worst state among the eSignature group's components**, with the page-wide
description carried in `message` so nothing is hidden. If Docusign ever restructures the page and
that group disappears, the check falls back to the page rollup rather than silently reporting `ok`.

The eSignature group's members are the regional instances — `NA1`–`NA4`, `EU`, `AU`, `CA`, `JP1`,
`USFED`, `FedRAMP`, `DEMO` — which map onto the `base_uri` host a Connection was issued. They are
reported individually as `esignature/na4`, `esignature/demo` and so on, so a host can see *which*
region is down. The check cannot narrow to one region: it is app-scoped and credential-free, so it
has no Connection to read a `base_uri` from, and making it per-Connection would multiply one useful
call by the number of users.

Docusign also publishes `history.rss` and `history.atom`, which this spec's `feed` mechanism could
consume. They are not used: a feed is a log of *incidents*, and the component tree answers the
sharper question — is my region healthy right now.

### `quota` — API rate-limit headroom

Unlike most apps in this pack, this is a **real reading**, not an `unavailable` note. Docusign
returns its counters as response headers on ordinary API calls
([resource limits](https://developers.docusign.com/platform/resource-limits/)):

| Header | Meaning |
|---|---|
| `X-RateLimit-Limit` | Requests per hour from **all** apps on the account. Default 3,000. |
| `X-RateLimit-Remaining` | Requests left this hour. |
| `X-RateLimit-Reset` | Unix epoch seconds when the hourly window resets. |
| `X-BurstLimit-Limit` | Requests per 30-second burst. 200 in the developer environment, 500 in production. |
| `X-BurstLimit-Remaining` | Requests left in this 30-second span. |

Both buckets are reported (`hourly`, `burst-30s`) because they fail differently: the hourly one is
an allowance you plan against, the burst one is what a tight polling loop trips within a minute.

The probe is `GET {base_uri}/restapi/v2.1/accounts/{accountId}` (`Accounts: get`) — the lightest
account-scoped read in the eSignature API. Chosen over the obvious alternatives deliberately:

- **not `/envelopes`** — needs a `from_date`, returns a page of data, and Docusign meters envelope
  GETs separately and more tightly; a health check should not compete with the workflow it checks.
- **not `/oauth/userinfo`** — it lives on the *authentication* host, which carries no eSignature
  rate-limit headers, and it has its own hourly cap. Right probe for credential liveness (which is
  what `test` uses), wrong one for quota.
- **not `/service_information`** — unauthenticated, so it reports no account's allowance.

Signed and per-Connection, because the counters are per account.

**The honest caveat:** Docusign states the rate-limit headers "are not included with all responses",
and advises that the last values you received remain valid. This check keeps no history across runs,
so when the headers are absent it reports `unknown` with a message saying so, rather than inventing
a number or implying exhaustion. A `429` is reported as `down` — that one is unambiguous.

### `auth:oauth2` / `auth:oauth2-demo` — credential liveness

Derived by the runtime from each Auth method's `test` hook. No declaration needed.

## Development

```sh
cd apps/docusign
deno task test    # 140 unit tests
deno task check
deno task lint
deno task fmt
```

## Icon

`assets/icon.svg` is Docusign's own square brand mark — the three paths (`#4C00FF`, `#FF5252`,
black) copied **verbatim** out of the inline logo SVG on <https://www.docusign.com/>, wrapped in an
`<svg>` element carrying the symbol's own `viewBox="0 0 193.7 193.7"`. The vendor's file is the full
horizontal logotype (`viewBox="0 0 1200 241.4"`); only the wordmark was dropped, so the mark itself
is unmodified. n8n has no Docusign node, so there was no upstream asset to port.

## Links

Every URL below was verified to return 200 on 2026-08-03.

- Vendor: <https://www.docusign.com/>
- Developer centre: <https://developers.docusign.com/>
- eSignature REST API reference: <https://developers.docusign.com/docs/esign-rest-api/reference/>
- Envelopes resource: <https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopes/>
- Authorization Code Grant: <https://developers.docusign.com/platform/auth/authcode/>
- `/oauth/userinfo` reference: <https://developers.docusign.com/platform/auth/reference/user-info/>
- OAuth scopes: <https://developers.docusign.com/platform/auth/reference/scopes/>
- API resource limits: <https://developers.docusign.com/platform/resource-limits/>
- eSignature rules and limits: <https://developers.docusign.com/docs/esign-rest-api/esign101/rules-and-limits/>
- OpenAPI specifications (the machine-readable contract this app was built against):
  <https://github.com/docusign/OpenAPI-Specifications>
- GitHub org: <https://github.com/docusign>
- Status page: <https://status.docusign.com/>
