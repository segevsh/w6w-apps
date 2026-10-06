# Formspark

Form backend. Point your own HTML form at a URL and Formspark stores the submissions, emails you
and forwards them. This app drives Formspark's management API: workspaces, forms, email
templates and submissions.

- App id: `io.w6w.formspark` · categories: `forms`, `developer-tools`
- Host: `api.formspark.io` (the only entry in `network.allow`) · base `https://api.formspark.io/public/v1`
- Source of truth: Formspark's OpenAPI 3.1 document, `https://api.formspark.io/public/v1/openapi.json`
  (37,463 bytes, 16 operations over 10 paths, fetched 2026-10-06), `documentation.formspark.io/llms.txt`
  and the API pages (overview, pagination, errors), plus unauthenticated live probes against
  `api.formspark.io` the same day.

## Auth

One method, `api-token` (type `bearer`): `Authorization: Bearer <token>`.

Create a token at **dashboard.formspark.io/account/api-tokens** and paste it into the connection's
**API Token** field. A token carries the access of the account that created it, so it reaches every
workspace that account belongs to, limited to its scopes:
`workspaces|forms|submissions` x `read|write`. Grant only what the workflows need.

### The workspace must be upgraded

The management API is only available on **upgraded** workspaces (a $25 one-time payment per
workspace). A free workspace answers `403 upgrade_required` (with a `workspaceId` extension naming
it) to every form, template and submission call. Only `GET /me` and `GET /workspaces` stay open on
any plan, which is why **a connection can test green and still be unable to touch a form**. Use
`workspace-list` and look at `plan` (`FREE`, `BUNDLE_50000`, `DEALIFY`) to find a workspace that
qualifies.

### The probe is `GET /me`

Chosen by what the body holds. `/me` returns `{name, scopes, expiresAt, lastUsedAt, createdAt}`:
the token's label and metadata, never its value (so, unlike Mailjet `/apikey` or Follow Up Boss
`/me`, it is safe to probe and to store). It needs no scope and no upgrade. Verdicts come from the
problem body's stable `code`, with the status as a hint. Measured 2026-10-06, both
`401 application/problem+json`:

| Request | Status | `code` | `detail` |
|---|---|---|---|
| no `Authorization` header | 401 | `invalid_token` | Provide a token in the Authorization header. |
| `Bearer <garbage>` | 401 | `invalid_token` | The token is not valid. |

A **200 with a real token was not observed** (no token was available); the success path is from the
spec and the docs' example. The test hook builds the header by hand because only `sign` is
auto-applied to action traffic.

## Actions (16)

| Key | Type | Endpoint | Scope |
|---|---|---|---|
| `me-get` | read | `GET /me` | none |
| `workspace-list` | search | `GET /workspaces` | workspaces:read |
| `workspace-create` | perform | `POST /workspaces` | workspaces:write |
| `workspace-update` | perform | `PATCH /workspaces/{id}` | workspaces:write |
| `form-list` | search | `GET /forms?workspaceId=` | forms:read |
| `form-get` | read | `GET /forms/{id}` | forms:read |
| `form-create` | perform | `POST /forms` | forms:write |
| `form-update` | perform | `PATCH /forms/{id}` | forms:write |
| `form-delete` | perform | `DELETE /forms/{id}` | forms:write |
| `submission-list` | search | `GET /forms/{id}/submissions` | submissions:read |
| `workspace-submission-list` | search | `GET /workspaces/{id}/submissions` | submissions:read |
| `submission-delete` | perform | `DELETE /submissions/{id}` | submissions:write |
| `template-get` | read | `GET /forms/{id}/templates/{kind}` | forms:read |
| `template-set` | perform | `PUT /forms/{id}/templates/{kind}` | forms:write |
| `template-delete` | perform | `DELETE /forms/{id}/templates/{kind}` | forms:write |
| `template-preview` | read | `POST /forms/{id}/templates/{kind}/preview` | forms:read |

The scope column is the natural reading of the docs' scope list; the OpenAPI document does not
annotate scopes per operation, and the vendor reports the exact one needed in an
`insufficient_scope` error's `requiredScope`, which this app puts in the error message.

Notes:

- **Pagination.** Lists answer `{data, hasMore, nextCursor}`. While `hasMore` is true, pass
  `nextCursor` back as `startingAfter`. `limit` is 1-100 (Formspark's default is 25, prefilled).
  Cursors are opaque; a cursor Formspark did not issue is a 400 `validation_error`.
- **Errors** are `application/problem+json`. The thrown message is
  `Formspark <status> <code>: <detail>`, followed by `errors[]`, `requiredScope` and `workspaceId`
  when present. Branch on the code; the `detail` wording can change.
- **PATCH keeps what you don't send; `null` clears.** `form-update` omits blank fields and has a
  **Clear fields** multiselect (`description`, `technology`, `webhookUrl`, `slackChannel`,
  `customHoneypot`, `customSpamWords`, `spamProtection`) that sends `null` for the named ones.
  `notificationEmails`, when given, replaces the whole list.
- **POST is not retry-safe.** "A repeated POST creates a second form or workspace": check whether
  it landed first. `form-create` and `workspace-create` are `idempotent: false`.
- **`template-set` is destructive.** It replaces whatever the template held, including a layout
  built in the visual editor, and that cannot be undone. Check `paused` in the result: Formspark's
  content check may stop a template from sending. `409` means custom notification templates are
  switched off; `400 template_invalid` stores nothing. The template routes can answer `503
  upstream_unavailable`; retry after a pause.
- **Spam submissions can't be deleted early.** `submission-delete` on a quarantined submission is
  a `409 conflict`; it expires on its own.
- **Captcha secret keys, the Slack token and the Zapier key** live only in the dashboard. A form's
  `spamProtection` can only be set for a provider whose key is already stored there.

## Not covered

- **Submission ingest** (`POST https://submit-form.com/{formId}`): a separate, unauthenticated host.
  The docs describe the request (form or JSON body, `Accept: application/json`, `_`-prefixed control
  fields, `_email.*` overrides) but **document no JSON response shape** beyond "check `response.ok`".
  Not confirmed, so no action and `submit-form.com` is not in `network.allow`.
- Anything in the dashboard only: captcha secret keys, Slack/Zapier/Make/Notion/Airtable/Sheets
  integrations, team members, vouchers, exports, autoresponder on/off (the autoresponder *template*
  is covered).

## Icon

`assets/icon.png` is Formspark's own `https://formspark.io/apple-touch-icon.png`, saved verbatim
(2,491-byte 180x180 PNG, fetched 2026-10-06). `https://formspark.io/favicon.svg` answers 404, so
there is no SVG to ship. The manifest references it as `icon.url`.

## Health checks

| Key | Kind | What it does |
|---|---|---|
| `service` | service | Declared absence, `severity: informational`. `status.formspark.io` is a custom 7 KB HTML page with no Statuspage / Instatus / Better Stack marker, and `/index.json` returns HTML, so there is no feed to declare. |
| `api` | dependency | Unsigned `GET /me` (`credential: none`, `scope: app`). A schema-correct `401` problem+json with a string `code` is a **pass**; an HTML body or a 5xx is `down`; any other JSON is `unknown`. |
| `quota` | quota | Declared absence, `severity: informational`. Rate limiting is per IP with no published figure or header; `GET /workspaces` has `submissionsQuota` but no used count. |
| `auth:api-token` | derived | The auth `test` hook (`GET /me`). Passes on a free workspace; see above. |

`unavailable` entries always report `unknown`, so both carry `severity: informational` or they would
pin the app's verdict there forever.
