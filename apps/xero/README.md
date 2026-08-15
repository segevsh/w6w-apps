# Xero

Manage Xero contacts, invoices, bank transactions, items and the chart of accounts.

- **Categories** — finance
- **Auth methods** — oauth2
- **Actions** — 13
- **Egress allowlist** — `api.xero.com`, `identity.xero.com`
- **Website** — https://www.xero.com
- **API docs** — https://developer.xero.com/documentation

## Auth: tenant discovery

Xero's OAuth is unusual in the same way Jira's is: an access token doesn't say which
organisation to call — a token can be authorised for **several** ("tenants" in Xero's
terms), and every Accounting API request must carry an `Xero-tenant-id` header naming
one. There is no way to know which tenants a token can reach from the token itself.

So right after the token exchange, `auth/oauth2.ts`'s `afterConnect` hook calls:

```
GET https://api.xero.com/connections
Authorization: Bearer <access token>
```

which returns every organisation the token is authorised for — `id`, `authEventId`,
`tenantId`, `tenantType`, `tenantName`, `createdDateUtc`, `updatedDateUtc`. Only the
**first** tenant is used: its `tenantId`, `tenantName` and `tenantType` are recorded on
the Connection's `display`, which is what `sign` reads to stamp `Xero-tenant-id` on
every subsequent request. A token authorised for several organisations needs one
Connection per organisation — the same choice Jira's `oauth2.ts` makes for cloud ids.
The full tenant list is also recorded (as `display.tenants`) purely for display and
diagnostics; nothing in this app reads it back.

`sign` stamps two headers on every outbound request:

```
Authorization: Bearer <access token>
Xero-tenant-id: <tenantId from display>
```

`ctx.fetch` is documented as **unsigned** for every auth-phase hook other than `sign`
itself (see the Hook Runtime RFC's sandbox posture table), so both `test` and
`afterConnect` set the `Authorization` header by hand rather than assuming the runtime
has already run `sign` for them.

`offline_access` is in the scope list so a refresh token is issued — without it the
connection would die when the access token expires (Xero access tokens last 30
minutes) and scheduled runs would strand. No custom `refresh` hook is implemented:
Xero's refresh flow is the standard OAuth 2.0 `refresh_token` grant against the same
token endpoint, which this app's host handles via the built-in default refresh
handler — the same choice Jira, Salesforce and HubSpot make in this pack.

### Scopes

Xero has been migrating new apps off one broad `accounting.transactions` scope onto a
granular, per-resource set since March 2026. This app uses the granular set, narrowed
to exactly what its actions touch:

| Scope | Covers |
|---|---|
| `offline_access` | Issues a refresh token |
| `accounting.contacts` | Contacts (list/get/create/update) |
| `accounting.invoices` | Invoices (list/get/create/update) |
| `accounting.banktransactions` | Bank transactions (list/get) |
| `accounting.settings` | Accounts and Items (list/get) — Xero has no separate scope for either |

## Actions

| Resource | Actions |
|---|---|
| Contact | `contact-list`, `contact-get`, `contact-create`, `contact-update` |
| Invoice | `invoice-list`, `invoice-get`, `invoice-create`, `invoice-update` |
| Bank transaction | `bank-transaction-list`, `bank-transaction-get` |
| Item | `item-list`, `item-get` |
| Account | `account-list` |

Create/update actions accept an `additionalFields` / `fields` JSON param carrying
Xero's own PascalCase field names (`EmailAddress`, `Status`, `LineItems`, …) rather
than a fixed param per field — the same approach Jira's `additionalFields` and
Salesforce's `fields` params take, so the action surface doesn't have to enumerate
every field Xero's Accounting API accepts.

Deliberately absent: credit notes, purchase orders, quotes, payments, manual
journals, reports and attachments (multipart upload, which the sandbox's `ctx.fetch`
is not for) — all real Xero resources, left out to keep this first pass to the
actions the spec asked for.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs as an action-adjacent probe.

### Is the vendor up?

**Service status** — <https://status.xero.com>, an Atlassian Statuspage instance
(confirmed directly: `GET https://status.xero.com/api/v2/summary.json` returns a
`status.indicator` of `none`/`minor`/`major`/`critical` plus a `components` array).
Xero also runs a separate developer/API status page at
<https://status.developer.xero.com>; this app checks the main product page, which is
the one that covers the Accounting API it calls.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one
of the three it performs itself.

```
GET https://api.xero.com/connections
```

The same tenant-discovery endpoint `afterConnect` uses. It needs no accounting scope
beyond having connected at least one organisation, so it works for a narrowly-scoped
token the way `test` should.

Nothing in this app's actions calls that endpoint's *bare* form during normal use — it
is `sign`ed the same as any other request, but it lives outside `w6w.network.allow`'s
action-facing surface conceptually (it is on `api.xero.com`, which the actions also
call, so no allowlist widening was needed here).

### Do we have quota left?

Xero answers every Accounting API call with three rate-limit headers documented at
`developer.xero.com/documentation/best-practices/api-call-efficiencies/rate-limits`:

- `X-MinLimit-Remaining` — of 60 calls/minute, per app-per-tenant.
- `X-DayLimit-Remaining` — of 5,000 calls/day, per app-per-tenant.
- `X-AppMinLimit-Remaining` — of 10,000 calls/minute, app-wide across all tenants.

There is no matching "-Limit" total header for any of the three — the ceilings are
fixed, documented constants, so `health/quota.ts` hardcodes them rather than reading a
header that doesn't exist. The probe is `GET /Organisation`, chosen because it is
outside this app's action set (like Jira's `/myself` and Salesforce's `/limits`) and
is Xero's lightest documented Accounting API read.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 60s | `health/quota.ts` |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `status.xero.com` (for `service`) is reachable **only inside that hook's
worker** — not from any action, and not from the other checks. The spec allows the
widening precisely because the check is unsigned; pairing an extra host with
`credential: "signed"` is rejected at load time, so a credential can never reach a
status host.


## Icon

`assets/icon.svg` — the vendor's current icon and blue.

Taken from <https://www.xero.com/content/dam/xero/pilot-images/admin/icons/favicon/favicon.svg> on 2026-08-15.

- **3,045 bytes**, `image/svg+xml`, md5 `9af5f9dbbd9434653978552c94a1bc9a`
- re-framed onto the pack's square canvas by `_tools/icon-normalize.ts`; the artwork
  inside the nested `<svg>` is the vendor's, verbatim

---

Researched and endpoint-verified 2026-07-31 against developer.xero.com (via search-
indexed content — several documentation pages timed out on direct fetch) and a direct
fetch of `status.xero.com/api/v2/summary.json`. Status surfaces and scope names move;
re-check if a probe starts failing for everyone at once.
