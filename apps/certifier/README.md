# Certifier

Issue and manage digital certificates and badges with [Certifier](https://certifier.io) from a
workflow: create a credential for a recipient from a credential template, issue it, email it, search
and update credentials, manage the templates and read the designs they use, and read or record the
interaction events (views, shares, downloads, verifications).

- **Base URL** `https://api.certifier.io/v1` (the only host in `network.allow`)
- **Auth** a workspace access token, sent as `Authorization: Bearer <token>` plus the required
  `Certifier-Version: 2022-10-26` header, both stamped by the Auth `sign` hook only
  (Certifier > Settings > Developers > Access Tokens)
- **Source of truth** Certifier's OpenAPI 3 document, `https://developers.certifier.io/api/openapi.json`
  (`info.version` 2022-10-26, 19 operations), plus the docs pages for auth, pagination, versioning,
  errors and rate limits, fetched 2026-10-06. The old `support.certifier.me` host answers 410; the
  real reference is `developers.certifier.io`. Nothing is documented as deprecated.

## Actions (19)

| Resource | Actions |
|---|---|
| Credentials | `credential-list`, `credential-get`, `credential-create` (draft), `credential-create-issue-send`, `credential-issue`, `credential-send`, `credential-update`, `credential-delete`, `credential-search`, `credential-designs-get` |
| Credential interactions | `interaction-list`, `interaction-create` |
| Credential templates (API: "groups") | `template-list`, `template-get`, `template-create`, `template-update`, `template-delete` |
| Designs | `design-list`, `design-get` |

## Behaviour worth knowing

- **Credential templates are `/groups`.** The docs call them "credential templates (groups)" and the
  `groupId` field names one. Actions here say "template" and map to `/v1/groups`.
- **Draft, issue, send are three states.** `credential-create` makes a `draft`; `credential-issue`
  moves draft to `issued`; `credential-send` emails an `issued` one. `credential-create-issue-send`
  does all three. A credential needs a recipient email to be sent.
- **No idempotency key exists**, so every create and send action is declared `idempotent: false`: a
  retry makes a second draft or emails the recipient again.
- **Dates are `YYYY-MM-DD` only**; the app rejects anything else before the request. To remove an
  expiry date, `credential-update` has a `clearExpiryDate` flag that sends an explicit `null`.
- **Pagination is a cursor**: lists return `{ data, pagination: { prev, next } }`; pass `next` back as
  `cursor`. Default page 20, maximum 100.
- **Search** (`credential-search`) takes Certifier's filter object (`AND`/`OR`/`NOT` over status,
  recipient, group and dates) as JSON. When a sort is given the API wants both `property` and `order`,
  so order defaults to `desc`.
- **`credential-designs-get` answers a bare array**, not a `data` envelope; the action wraps it as
  `{ designs }`.
- **Rate limit** is about 3 requests per second; a 429 carries `Retry-After` (seconds) and the error
  message reports it.
- Credentials returned by list and search carry each recipient's name and email.

## Health checks

- **`service`** (`kind: service`, host `status.certifier.io`): the status page is a custom page, not
  Statuspage, Instatus or Better Stack (`/api/v2/summary.json`, `/index.json`, `/history.atom` all 404).
  Its page script reads `GET /api/status`, which returns six boolean monitors: Certifier App, Issuer
  Portal, API, Database & Storage, Docs and Help Center. Only the `API` monitor decides the verdict; the
  rest are reported as components. An unreachable or unrecognisable page is `unknown`, never `down`.
- **`api`** (`kind: dependency`): unsigned `GET /v1/groups?limit=1`. The gateway answers a JSON
  `{"error":{"code":"unauthorized"}}` 401, which proves the API is serving, so that is a pass.
- **`auth:access-token`** (derived from `test`): `GET /v1/groups?limit=1` with the token. The probe
  reads template names rather than `/credentials`, which returns recipients' personal data. Success
  needs the documented `{ data: [] }` page, and failures are classified from the body's error code.
- **Quota**: Certifier publishes no quota endpoint or rate-limit header, so none is declared.

## Not covered, and why

- **Webhooks** are documented (`/docs/api-reference/webhooks`) but the OpenAPI document has no webhook
  management endpoints, so there is nothing to call; they are configured in the Certifier dashboard.
- **`GET /v1/me`** appears in the versioning page's example but is not in the OpenAPI document, so it
  is not used.
- **MCP server** (OAuth) is a separate surface and not part of this app.

## Icon

`assets/icon.svg` is the vendor's own `https://developers.certifier.io/favicon.svg`, byte for byte
(it embeds a 200x200 raster mark as a data URI inside an SVG wrapper). `certifier.io/favicon.svg`
answers a 404 HTML page. Always run `deno task fmt`, never bare `deno fmt`.

## Develop

```bash
deno task validate && deno task check && deno task lint && deno task fmt && deno task test
```
