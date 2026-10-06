# EZ Texting

Send SMS/MMS, manage contacts and groups, read the two-way inbox, and subscribe webhooks on the
**EZ Texting API v1**.

- **Categories** - communication, marketing
- **Auth methods** - basic (HTTP Basic)
- **Actions** - 31
- **Health checks** - 2 (`service`, `quota`) + the derived `auth:basic`
- **Egress allowlist** - `a.eztexting.com` (the `service` health check adds `status.eztexting.com`
  to its own hook allowlist, never to the app's)
- **Website** - https://www.eztexting.com/
- **API docs** - https://developers.eztexting.com/reference/ (ReadMe-hosted; the full OpenAPI
  document is embedded in each page's `ssr-props` script tag)
- **Status page** - https://status.eztexting.com/

> Verified 2026-10-06 against the OpenAPI document embedded in the vendor's developer portal (57
> operations), its Authentication, Pagination, Errors and Rate Limits guides, and live
> **unauthenticated** probes of `https://a.eztexting.com/v1` and its status page. No credential was
> available, so no authenticated 2xx response was observed: every success shape below comes from the
> vendor's schema, not from a live call.

## Auth setup

1. Use the **username (or email) and password you sign in to EZ Texting with** - the Authentication
   guide says the API uses "the same username/password pair you use to sign in to the user
   interface". The token endpoint names the same two values `appKey` / `appSecret` ("App key or user
   email/username", "App secret or user password").
2. Add a connection in w6w and enter them in the two fields. They are sent as
   `Authorization: Basic base64(user:pass)` by the auth `sign` hook only; actions never see them.
3. The connection test calls `GET /v1/credits` and decides from the response **body**.

OAuth2 Bearer (`POST /v1/tokens/create`, plus `/refresh` and `/revoke`) is documented too - a 90
minute access token and a 60 day refresh token - but it is the same credential pair exchanged for a
short-lived token, so it is deliberately not implemented.

## Actions

| Key | Title | Type | Endpoint |
| --- | ----- | ---- | -------- |
| `contact-batch-upsert` | Create or Update Contacts (Batch) | perform · idempotent | `POST /v1/contacts/batch` |
| `contact-delete` | Delete Contact | perform · idempotent | `DELETE /v1/contacts/{phoneNumber}` |
| `contact-get` | Get Contact | read | `GET /v1/contacts/{phoneNumber}` |
| `contact-list` | List Contacts | search | `GET /v1/contacts` |
| `contact-upsert` | Create or Update Contact | perform · idempotent | `POST /v1/contacts` |
| `conversation-list` | List Conversations | search | `GET /v1/conversations` |
| `conversation-message-list` | List Conversation Messages | search | `GET /v1/conversations/conversation/{userNumber}/{contactNumber}` |
| `credit-balance-get` | Get Credit Balance | read | `GET /v1/credits` |
| `group-add-contacts` | Add Contacts to Group | perform · idempotent | `POST /v1/contact-groups/{id}/contacts` |
| `group-create` | Create Contact Group | perform | `POST /v1/contact-groups` |
| `group-delete` | Delete Contact Group | perform · idempotent | `DELETE /v1/contact-groups/{id}` |
| `group-get` | Get Contact Group | read | `GET /v1/contact-groups/{id}` |
| `group-list` | List Contact Groups | search | `GET /v1/contact-groups` |
| `group-remove-contacts` | Remove Contacts from Group | perform · idempotent | `DELETE /v1/contact-groups/{id}/contacts` |
| `group-update` | Update Contact Group | perform · idempotent | `PUT /v1/contact-groups/{id}` |
| `keyword-check` | Check Keyword Availability | read | `GET /v1/keywords/{keyword}/check` |
| `keyword-get` | Get Keyword | read | `GET /v1/keywords/{keyword}` |
| `keyword-list` | List Keywords | search | `GET /v1/keywords` |
| `media-create` | Create Media File | perform | `POST /v1/media-files` |
| `media-delete` | Delete Media File | perform · idempotent | `DELETE /v1/media-files/{id}` |
| `media-get` | Get Media File | read | `GET /v1/media-files/{id}` |
| `media-list` | List Media Files | search | `GET /v1/media-files` |
| `message-delete` | Delete Messages | perform · idempotent | `DELETE /v1/messages` |
| `message-details-get` | Get Message Details | read | `GET /v1/message-details/{id}` |
| `message-list` | List Messages | search | `GET /v1/messages` |
| `message-report-get` | Get Message Report | read | `GET /v1/message-reports/{id}` |
| `message-send` | Send Message | perform | `POST /v1/messages` |
| `outbound-block` | Block Outbound Texts | perform · idempotent | `POST /v1/blocks` |
| `webhook-create` | Create Webhook | perform | `POST /v1/webhooks/subscriptions` |
| `webhook-delete` | Delete Webhook | perform · idempotent | `DELETE /v1/webhooks/subscriptions/{id}` |
| `webhook-list` | List Webhooks | search | `GET /v1/webhooks/subscriptions` |

Lists take `page` (from 0), `size` (one of 10, 20, 50, 100, 200; default 20) and `sort`
(`field,asc|desc`), and answer `{content, totalPages, totalElements, numberOfElements}`. Filter
params are sent as `filters[field][eq|like|gte|lte]`.

## Not yet covered

Left out on purpose, not forgotten:

- **`POST /v1/credits/purchase`**, **`POST /v1/keywords/{keyword}/acquire`** and
  **`.../purchase`** - these spend money against a stored card (they require its last four digits);
  a workflow should not do that unattended.
- **`DELETE /v1/keywords/{keyword}/release`** and **`PUT /v1/keywords/{keyword}`** (change keyword
  settings) - destructive / settings writes with no way to validate the body shape beyond the schema;
  keyword *reads* are covered.
- **Message templates** (`/v1/message-templates`, 5 operations), **contact fields**
  (`/v1/contact-fields`, 4), **campaign info** (`GET /v1/campaign-info`), the three
  **message report response lists** (`/v1/message-reports/{id}/responses/*`), **archive / restore
  conversation**, **mark messages read / unread**, and **get webhook** - all documented, simply not
  built in this pass; each is one small action over the shared client.
- **Token endpoints** (`/v1/tokens/*`) - see Auth setup.
- **Webhook payload ingestion** - this app creates and removes subscriptions but defines no trigger;
  the webhooks guide page was not retrievable (`/docs/webhooks.md` answers "Page not found"), so the
  callback payload and secret-verification scheme are not documented here.

## Findings that cost a day

1. **`servers[0].url` is a bare host** (`a.eztexting.com`, no scheme) and the OAuth `tokenUrl` in
   the same document points at a **staging host** (`nova-app.stg0.cf.wtf`). Neither is usable as
   written: the real base is `https://a.eztexting.com/v1`, the real token path
   `/v1/tokens/create`.
2. **Several `PUT` / `DELETE` operations answer `200` with no body at all**, and creates answer `201`
   with just `{id}`; response parsing must tolerate an empty body.
3. **List/remove members of a group travels in the query string**: `POST` and `DELETE`
   `/v1/contact-groups/{id}/contacts?phoneNumbers=...` take no body. This app repeats the key per
   number (the OpenAPI default for an array query param, which the spec does not override); that
   serialization was not exercised against a live account.
4. **`DELETE /v1/messages` takes a JSON body** (`{"ids": [int64]}`) and `size` is a **string enum**,
   not a number.
5. **Rate limit**: 200 requests/minute; a `429` carries `X-Rate-Limit-Retry-After-Milliseconds`.
6. **The status page is shared with CallFire** (same owner). The page-level indicator can be red for
   a CallFire incident, so the `service` check keys on the component named exactly "EZ Texting API".
7. **The legacy API is retired** - the portal carries a "Legacy Migration Guide"; nothing here
   touches it.

## Health checks

- `service` - Atlassian Statuspage at `status.eztexting.com/api/v2/summary.json` (`page.id`
  `nmm9j2skbrxf`, `page.name` "EZ Texting Status", read live 2026-10-06). The verdict is the "EZ
  Texting API" component only; EZ Texting SMS/MMS components are reported alongside but do not move
  it, and CallFire components are ignored. The page name and URL are re-checked on every run; a page
  that stops naming the component reports `unknown`, never `down`.
- `quota` - `GET /v1/credits` -> `totalCredits`; `down` only at zero, otherwise `ok`, with the balance
  as a quota reading. A non-2xx or an unexpected body is `unknown`. The rate limit is only signalled
  by a 429, so no rate-limit headroom is reported.
- `auth:basic` (derived) - `GET /v1/credits`. The response is three integers, never the caller's own
  credential, so the probe cannot echo it. The body decides: `200` with a numeric `totalCredits` is
  ok; `401` with the vendor's message ("Invalid username or password" / "Missing authorization
  header", both observed live) is a rejected credential; anything else is not treated as a
  statement about the credential.

## Icon

`assets/icon.png` is the vendor's own 96x96 favicon, saved verbatim (4,116 bytes, no re-encoding) from
`https://www.eztexting.com/themes/custom/ezevo/favicon-96x96.png`. `/favicon.svg` and
`/apple-touch-icon.png` on the same host answer 404, so no SVG exists to use.

## Development

```bash
deno task validate && deno task check && deno task lint && deno task fmt && deno task test
```
