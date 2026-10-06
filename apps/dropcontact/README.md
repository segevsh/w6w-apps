# Dropcontact

B2B contact enrichment for a workflow: find and verify business emails and add company data
(website, LinkedIn, SIREN/SIRET, VAT, NAF, headcount, turnover, job level and function). Vendor docs:
<https://developer.dropcontact.com/>.

Category: **crm** (also `marketing`). Icon: the vendor's own mark, `DropcontactSymbol.png` from
dropcontact.com's site, verbatim.

## Connecting

Create an API access token in your Dropcontact account. It is sent as `X-Access-Token: <token>` by the
connection's `sign` hook; no action ever sees it. The connection test posts one empty contact, which
the reference documents as returning the remaining credits without consuming any.

## Actions (7)

| Action | Route | Notes |
| --- | --- | --- |
| Submit Enrichment Batch | `POST /v1/enrich/all` | up to 250 contacts; returns a `request_id` |
| Get Enrichment Result | `GET /v1/enrich/all/{request_id}` | `ready: false` while processing; optional `forceResults` |
| Enrich Contact | `POST` then `GET /v1/enrich/all/...` | one contact; optional in-step polling (`waitSeconds`) |
| Get Credits Left | `POST /v1/enrich/all` with `{"data":[{}]}` | documented as spending no credit |
| Get Default Webhook | `GET /v1/enrich/webhook` | |
| Set Default Webhook | `PUT /v1/enrich/webhook` | `{callback_url}` |
| Delete Default Webhook | `DELETE /v1/enrich/webhook` | |

Per-request webhooks need no action: pass **Webhook URL for this request** (`custom_callback_url`) to
either submit action.

**Not included, on purpose:** receiving the webhook (the app has no trigger; the payload is documented
as a JSON list with `event_type: "enrich_api_result"`, and Dropcontact calls from 18.202.84.106,
52.48.65.147 and 54.74.141.102); the hosted MCP server at `mcp.dropcontact.com`; the file-upload and
CRM products shown on the status page (no API documented). The reference does not document the
response bodies of the three webhook routes, so those actions return the vendor envelope as
`response` and read `callback_url` only if present. They were not run against a live account.

## Vendor behaviour worth knowing

- **The host is `api.dropcontact.com`.** `api.dropcontact.io` is an AWS API Gateway that answers every
  path `403 Missing Authentication Token`.
- **"Not ready" is HTTP 200.** `GET /all/{id}` answers `{"error":false,"success":false,"reason":"Request
  not ready yet, try again in 30 seconds"}` until the batch finishes. `success: false` is not a
  failure; only `error: true` is. The actions return `ready: false`.
- **No balance endpoint.** `credits_left` rides on every POST and GET; an empty `{"data":[{}]}` POST
  reads it for free.
- **Charged on success.** A credit is spent only for a verified email returned (or an email you supply
  being verified); no email found means an automatic refund. `forceResults=true` can hand back
  unprocessed contacts unchanged, which may be charged later if an email is found afterwards.
- **A refusal is a body, not a status.** A missing token is `401 {"error":true,"reason":"No api key
  received…"}`, a wrong one `401 {"reason":"Unknown account"}`; documented `403` is "Token exceeded
  quota". Limit: 60 requests per second.
- **A contact needs context.** An email, a LinkedIn URL, or name plus company. Contact fields with no
  company identifier are reported per entry as `errors.only_contact_data`, and unknown fields as
  `errors.unexpected_field` (a hard 400 for accounts created from June 2026).
- `industry` and `employee_count` come back only on trial or growth plans.

## Health checks

| Check | Kind | Probe |
| --- | --- | --- |
| `service` | service | <https://status.dropcontact.com/api/v2/summary.json> (Statuspage). Page verified real: id `x803htx24trw`, name Dropcontact, five Dropcontact components. The `Dropcontact API` component (id `hdj96nlnshmj`) decides; APP, FILE, CRM and website are detail capped at `degraded`. |
| `api` | dependency | Unsigned `POST /v1/enrich/all`; the schema-correct `401 {"error":true,"success":false,"reason":"No api key received…"}` is a pass, a 5xx is `down`. |
| `quota` | quota | Signed zero-cost `POST /v1/enrich/all` with `{"data":[{}]}`: `credits_left` reading, `down` at zero or on a 403. `informational`, since the vendor publishes no plan total. |

Plus the derived `auth:api-key` check from the connection test.

## Development

```bash
deno task fmt && deno task validate && deno task check && deno task lint && deno task test
```
