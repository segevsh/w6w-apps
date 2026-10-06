# Formsite

Read Formsite forms, items and results, and manage result-completed webhooks.

- **Categories** — forms
- **Auth methods** — token (bearer access token + server + user directory)
- **Actions** — 8
- **Egress allowlist** — `*.formsite.com`
- **Website** — https://www.formsite.com
- **API docs** — https://support.formsite.com/hc/en-us/articles/46181026038931-API
- **Icon** — `assets/icon.svg` is Formsite's own logo, byte-identical to
  `https://www.formsite.com/wp-content/uploads/2018/09/formsite-logo-blue.svg`.

## Connecting

Formsite accounts live on numbered servers and are addressed by a user directory, so a
connection takes three values, all shown on a form's **Settings → Integrations → Formsite API**
page: the **server** (`fs3` in `fs3.formsite.com`), the **user directory** (`example` in
`fs3.formsite.com/example/form1`) and the **access token**. API access requires a
Professional-level Formsite plan. Limits: 50 calls/minute, 10,000/day per account.

## Actions

| Action | Endpoint |
| --- | --- |
| `form-list` | `GET /{user_dir}/forms` |
| `form-get` | `GET /{user_dir}/forms/{form_dir}` |
| `form-items-list` | `GET /{user_dir}/forms/{form_dir}/items` |
| `result-list` | `GET /{user_dir}/forms/{form_dir}/results` |
| `result-search` | same, with `search_equals/contains/begins/ends[item]` and `search_method` |
| `webhook-list` | `GET /{user_dir}/forms/{form_dir}/webhooks` |
| `webhook-create` | `POST …/webhooks` (upserts on URL; event `result_completed`) |
| `webhook-delete` | `DELETE …/webhooks?url=` |

Left out because the API documents nothing for them: submitting, editing or deleting results,
creating forms, and listing Results Views / Results Labels (referenced by id only). The webhook
POST body is sent as JSON; the article lists the fields but not the encoding, and this was not
exercised against a live account.

## Health check

### Is the vendor up?

Formsite is run by Intellistack, whose page is <https://status.formstack.com>. It is an HTML page:
`/api/v2/summary.json` and `/api/v2/components.json` both return the HTML shell rather than
Statuspage JSON, and no Formsite API component is published. Declared `unavailable`
(informational).

### Is this credential live?

The `token` auth `test` hook probes `GET /{user_dir}/forms`, which returns form metadata only (it
does not echo the token). The verdict is read from Formsite's `{ "error": { "message", "status" } }`
body, with the HTTP status as a fallback.

### Do we have quota left?

No rate-limit headers are documented, so there is no quota check.

## Declared health checks

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
| --- | --- | --- | --- | --- | --- | --- |
| `service` | service | — | — | informational | — | unavailable (see above) |
| `domain` | dependency | connection | context | degraded | 120 s | unsigned `GET /{user_dir}/forms`; 401 passes, 404/5xx down, 429 degraded |
