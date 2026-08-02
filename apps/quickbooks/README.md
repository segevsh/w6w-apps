# QuickBooks

Manage QuickBooks Online customers, invoices, items, vendors, payments, bills, the chart of
accounts and estimates, run a Profit and Loss report, and fall back to a raw query for anything
else.

- **Categories** — finance
- **Auth methods** — oauth2
- **Actions** — 20
- **Egress allowlist** — `quickbooks.api.intuit.com`, `developer.api.intuit.com`
- **Website** — https://quickbooks.intuit.com
- **API docs** — https://developer.intuit.com/app/developer/qbo/docs/api/accounting

## Auth: `realmId` is a connect-time field, not something `afterConnect` resolves

This is the one thing worth understanding before touching `auth/oauth2.ts` or `lib/client.ts`.

Every other per-tenant App in this pack (Xero's tenants, Jira's cloud ids) discovers its tenant id
by calling a "what can this token reach" endpoint right after the token exchange —
`GET /connections` for Xero, `GET /oauth/token/accessible-resources` for Jira. **QuickBooks Online
has no such endpoint.** A QBO OAuth grant authorises exactly one company, and Intuit communicates
*which* one only by appending a `realmId` query parameter to the OAuth callback redirect —
confirmed against n8n's QuickBooks node, whose credential type reads it off
`oauthTokenData.callbackQueryString.realmId`.

The generic Auth `exchange` contract this pack's apps rely on (`{ fields?, code?, redirectUri? }`
— see the Hook Runtime RFC's hook registry) has no slot for an extra provider-appended callback
parameter, and this host's `/oauth/callback` route currently reads only `code` / `state` / `error`
off the query string. So there is, today, no path for `realmId` to reach any hook automatically.

Collecting it as a required connect-time field is the honest fallback given that constraint — the
same escape hatch Zendesk's `subdomain` and ServiceNow's `instance` use for a per-tenant value
their `sign` hook needs but their OAuth flow alone doesn't supply. The field's hint tells the user
where to find it: QuickBooks appends it to the browser URL right after authorizing
(`...&realmId=...`), and it's also visible in QuickBooks Online under Settings ⚙ → Account and
settings → Billing & subscription. If a future host learns to forward extra OAuth callback
parameters into `exchange` / `afterConnect`, this field can be dropped in favor of automatic
discovery — nothing else about the app would need to change, since `sign` and `lib/client.ts`
already read `realmId` off the connection the same way Jira reads its `cloudId`.

### Where `realmId` is used

Unlike Xero (a fixed host, tenant selected by an `Xero-tenant-id` **header**), every QuickBooks
Accounting API call is scoped to one company by a `realmId` **path segment**:
`/v3/company/{realmId}/...`. That makes `lib/client.ts`'s `baseFromConnection` closer in shape to
Jira's (a per-connection base URL) than to Xero's fixed `API_URL` constant, even though the
underlying idea — "resolve the tenant, stash it on the connection's `display`, read it back to
build every request" — is the same one Xero and Jira both use.

`sign` stamps only `Authorization: Bearer <access token>` — `realmId` never becomes a header, so
there is nothing for `sign` to add beyond the bearer token itself.

### Scope

QuickBooks has a single scope for the Accounting API — `com.intuit.quickbooks.accounting` — so
there is no narrowing to do the way Xero's granular per-resource scopes allow. `refresh` is not
implemented as a custom hook: Intuit's refresh flow is the standard OAuth 2.0 `refresh_token` grant
against the same token endpoint, which this app's host handles via the built-in default refresh
handler — the same choice Xero, Jira, Salesforce and HubSpot make in this pack.

`pkce: false` — Intuit's documented OAuth2 flow is the standard confidential-client authorization
code grant (client id + client secret); nothing in Intuit's docs mentions accepting a
`code_challenge`, so this app does not assert support it hasn't confirmed (the same choice
Zendesk and ServiceNow make for their own confidential-client flows).

Endpoints and scope were verified directly against Intuit's own OAuth2 credential defaults and
cross-checked against n8n's `QuickBooksOAuth2Api` credential type, which hardcodes the same three
URLs:

| Field | Value |
|---|---|
| Authorization URL | `https://appcenter.intuit.com/connect/oauth2` |
| Token URL | `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer` |
| Revoke URL | `https://developer.api.intuit.com/v2/oauth2/tokens/revoke` |
| Scope | `com.intuit.quickbooks.accounting` |

Authorization/token/refresh hosts (`appcenter.intuit.com`, `oauth.platform.intuit.com`) are
allowed implicitly for the OAuth flow itself, per the app contract — but `revokeUrl` isn't among
the URLs a host auto-allows, and its host (`developer.api.intuit.com`) differs from both, so it's
listed explicitly in `w6w.network.allow` alongside the API host (the same thing Xero does for its
own revoke/token host, `identity.xero.com`).

## Actions

| Resource | Actions |
|---|---|
| Customer | `customer-list`, `customer-get`, `customer-create`, `customer-update` |
| Invoice | `invoice-list`, `invoice-get`, `invoice-create`, `invoice-update` |
| Item | `item-list`, `item-get` |
| Vendor | `vendor-list`, `vendor-get` |
| Account | `account-list` |
| Payment | `payment-list`, `payment-create` |
| Bill | `bill-list`, `bill-create` |
| Estimate | `estimate-create` |
| Report | `report-profit-and-loss` |
| Generic | `query` |

QuickBooks has no dedicated "list" endpoint per entity — every list/search action goes through the
shared `/query` resource with QuickBooks' SQL-like query language (`SELECT * FROM <entity> WHERE
... ORDERBY ... STARTPOSITION n MAXRESULTS m`), which `lib/client.ts#buildQuery` builds. The
`query` action exposes that same endpoint directly, for entities this app has no dedicated action
for (`CreditMemo`, `JournalEntry`, `TaxCode`, `Deposit`, …) — deliberately included rather than
enumerating every QuickBooks entity as its own action pair.

Create actions take a `lines` (or `additionalFields`) JSON param carrying QuickBooks' own
PascalCase field/line shapes (`SalesItemLineDetail`, `AccountBasedExpenseLineDetail`, …) rather
than a fixed param per field — the same approach Xero's `additionalFields` and Jira's
`additionalFields` params take. Update actions require a `syncToken` (QuickBooks' optimistic-lock
version number, read off a prior `get`/`list`) and perform a **sparse update**
(`"sparse": true` — only the fields supplied change; QuickBooks rejects a stale `SyncToken` outright
rather than silently overwriting a concurrent edit).

Deliberately absent: employees, credit memos, journal entries, purchase orders, deposits, tax
codes, terms, attachments (multipart upload, which the sandbox's `ctx.fetch` is not for), delete /
void operations, and PDF download / email-send — all real QuickBooks resources or operations, left
out to keep this first pass to a well-chosen subset plus the generic `query` escape hatch. Most are
reachable read-only via `query` today (e.g. `SELECT * FROM JournalEntry`).

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
*vendor* up, is *this credential* live, and do we have *quota* left. Only the second is something
the app itself performs.

### Is the vendor up?

**Service status** — <https://status.developer.intuit.com>, an Atlassian Statuspage instance run
by Intuit's developer group (`GET https://status.developer.intuit.com/api/v2/summary.json` returns
a `status.indicator` of `none`/`minor`/`major`/`critical` plus a `components` array over the
standard Statuspage per-component vocabulary).

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the three
it performs itself.

```
GET https://quickbooks.api.intuit.com/v3/company/{realmId}/companyinfo/{realmId}
```

QuickBooks' lightest authenticated read — it needs no scope beyond the single accounting scope
every connection already carries, and doubles as the probe `afterConnect` uses to resolve the
company name for `connectionLabel`.

### Do we have quota left?

**Declared absent.** QuickBooks enforces a fixed, documented per-realm limit — 500 requests/minute
and 10 concurrent requests per company, per app — and answers an exceeded limit with HTTP 429 and
error code `003001` (`ThrottleExceeded`), but publishes no response header or endpoint exposing
remaining headroom the way Xero's `X-*Limit-Remaining` trio does. A declared absence always reports
`unknown`, so it carries `severity: "informational"` — otherwise it would pin every verdict for
this app at `unknown` forever.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md). The
three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | app | — | informational | — | _declared absent_ |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `status.developer.intuit.com` (for `service`) is reachable **only inside that hook's
worker** — not from any action, and not from the other checks. The spec allows the widening
precisely because the check is unsigned; pairing an extra host with `credential: "signed"` is
rejected at load time, so a credential can never reach a status host.

---

Researched 2026-08-02 via Intuit's own developer documentation (partially truncated on direct
fetch; cross-checked with search-indexed content), n8n's `nodes-base` QuickBooks node and OAuth2
credential type (a local checkout of `n8n-io/n8n`, used to verify exact endpoint paths, the
`realmId`-from-callback mechanism, and OAuth2 defaults against real, shipped code rather than
secondhand summaries), and a direct fetch of `status.developer.intuit.com`'s Statuspage API shape.
Status surfaces and undocumented limits move; re-check if a probe starts failing for everyone at
once.
