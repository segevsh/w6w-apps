# Sellsy

Search, read and write [Sellsy](https://www.sellsy.com) CRM and invoicing data through the
[Sellsy API v2](https://api.sellsy.com/doc/v2/) (`https://api.sellsy.com/v2`). App id
`io.w6w.sellsy`, 39 actions, two auth methods, two health checks.

Verified 2026-10-06 against the published OpenAPI document
(`https://api.sellsy.com/doc/v2/dist/sellsy.v2.latest.yaml`, v2.303.0). The legacy v1 API is not used.
The only deprecated operations in that document are the `/primes` endpoints, which are not covered.

## Authentication

| Method | Use when |
| --- | --- |
| **Personal OAuth client** (`client-credentials`) | Unattended runs. Create a *personal* client in Sellsy (Settings → API → V2 access); it acts as its owner. Only personal clients may use the client-credentials grant. Enter the client id and secret; the app mints and refreshes the 1-hour token itself. |
| **OAuth 2.0** (`oauth2`) | A private or public client with the authorization-code flow. PKCE is required by Sellsy. Authorize `login.sellsy.com/oauth2/authorization`, token and refresh at `login.sellsy.com/oauth2/access-tokens`. |

Sellsy scopes are granted per client in Sellsy, not requested per call. An action whose scope the
client lacks fails with a 403, and the message says so; every action description names its scope.

## Actions

- **Companies** — `company-search`, `company-get`, `company-create`, `company-update`,
  `company-delete`, `company-contact-link`
- **Individuals** — `individual-search`, `individual-get`, `individual-create`, `individual-update`
- **Contacts** — `contact-search`, `contact-get`, `contact-create`, `contact-update`
- **Opportunities** — `opportunity-search`, `opportunity-get`, `opportunity-create`,
  `opportunity-update` (PATCH), `opportunity-pipelines-list`
- **Tasks and comments** — `task-search`, `task-create`, `task-update`, `task-labels-list`,
  `comment-create`
- **Billing** — `estimate-search`, `estimate-get`, `estimate-status-update`, `invoice-search`,
  `invoice-get`, `item-search`, `item-get`, `payment-search`
- **Webhooks** — `webhook-list`, `webhook-events-list`, `webhook-create`, `webhook-delete`
- **Account** — `search` (global full-text), `staff-list`, `quota-get`

Search actions take the common filters as typed fields plus a raw `filters` JSON object for the rest
(date ranges, favourite filters, related objects). Create/update actions take the common fields plus an
`extra` JSON object merged into the body for anything the form does not list. Lists return
`{data, pagination, aggregations}`.

### Paging

Every list is capped at `limit` 100 (default 25). `pagination.offset` is an opaque cursor in Sellsy's
default "seek" mode: pass it back as `offset` to get the next page. Start with `offset: 0` instead for
numeric page-number paging (limited to the first 100,000 results).

## Health checks

- `service` — unsigned `GET /v2/quotas`. A schema-correct 401 (`{"error":{"code":401,…}}`) proves the
  API is up. `status.sellsy.com` is a custom page with no Statuspage API, no `index.json` and no
  Atom/RSS feed (all 404; the old `sellsy.statuspage.io` is inactive), so there is no status feed to
  declare.
- `quota` (informational) — `GET /v2/quotas` for the plan limits plus the `X-Quota-Remaining-By-*`
  response headers; degraded under 5 % headroom.
- The derived `auth:*` checks use `GET /v2/quotas` as well: it returns no secret, needs only
  `accounts.read`, and a 403 (token fine, scope missing) is treated as a working credential.

## Not covered

Add or edit estimate/invoice/order lines (`/estimates`, `/invoices` create and update with their
document-line model), credit notes, orders, deliveries, proposals, subscriptions, items create/update,
custom fields, smart tags, addresses, files upload, calendar events, phone calls, emails, listings,
accounting, e-signature, Slack-type webhooks and the `sign_key` webhook field. The `/primes`
endpoints are deprecated by Sellsy. Use `extra`/`filters` JSON for fields the forms omit.

## Notes

- Icon: Sellsy's desktop icon, `https://cdn.prod.website-files.com/6058a411307dccf59c654f37/612dde748938e88d67b08a01_Sellsy-DesktopIcon-Site-256.png`
  (PNG 256 px, linked from sellsy.com), embedded verbatim as a base64 data URI in `assets/icon.svg`.
- The token endpoint (`login.sellsy.com`) is a different host from the API; the runtime allows OAuth
  endpoint hosts implicitly, so `network.allow` lists only `api.sellsy.com`.
- Both a JSON body and a form body are accepted by the token endpoint (checked with a bogus client, both
  answered the same OAuth `invalid_client`); the app sends JSON, as the documentation's examples do.
  The `oauth2` method's code exchange is performed by the host, not this app, and was not exercised
  against a live client.
- Needs a real Sellsy account to run end to end; the unit tests use a mocked `ctx.fetch`.
