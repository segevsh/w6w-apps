# Zoho CRM

Create, read, update, search and convert Leads, Contacts, Deals and Accounts in Zoho CRM.

Scoped to **Zoho CRM specifically** — Zoho's wider SMB suite (Zoho Books, Zoho Desk, Zoho Mail, ...)
is out of scope here; each of those is a separate potential app.

- **Categories** — crm
- **Auth methods** — oauth2
- **Actions** — 21
- **Egress allowlist** — `www.zohoapis.com`
- **Website** — https://www.zoho.com/crm
- **API docs** — https://www.zoho.com/crm/developer/docs/api/v6/

## Actions

| Resource   | Actions                                    |
| ---------- | ------------------------------------------ |
| Lead       | list, get, create, update, delete, convert |
| Contact    | list, get, create, update, delete          |
| Deal       | list, get, create, update, delete          |
| Account    | list, get                                  |
| Task       | create                                     |
| Note       | create                                     |
| Any module | search (generic — `search-records`)        |

`search-records` reaches any module by API name — including a custom one — through Zoho's uniform
`GET /{module}/search`, rather than one `*-search` action per resource.

Zoho's Get Records / Get Record API requires an explicit `fields` query param (no "everything"
default); every list/get action ships a module-appropriate default so it stays usable without
looking up field names first.

## Regional accounts (US data centre only)

Zoho hosts customer data in one of several regional data centres — **US, EU, IN, AU, JP, CN, CA,
SA** — each with its own OAuth host (`accounts.zoho.com`, `accounts.zoho.eu`, `accounts.zoho.in`,
`accounts.zoho.com.au`, `accounts.zoho.jp`, `accounts.zoho.com.cn`, `accounts.zohocloud.ca`,
`accounts.zoho.sa`) and its own API host (`www.zohoapis.<tld>`). An account only exists on one data
centre, and the OAuth authorization/token endpoints are **not interchangeable** across them — an
EU-hosted account cannot complete an authorization request sent to `accounts.zoho.com`.

This app's `oauth2` method only offers the **US** authorization/token endpoints
(`accounts.zoho.com`). A EU/IN/AU/JP/CN/CA/SA-hosted account cannot connect through it at all today.
Once connected, every subsequent API call correctly addresses the org's own regional host: the OAuth
token response carries `api_domain` (e.g. `https://www.zohoapis.com`), which `afterConnect` records
on the connection and `lib/client.ts` reads back — mirroring how this pack's `salesforce` app
handles Salesforce's per-org `instance_url`. Lifting the US-only limitation would mean adding a
second (or configurable) `oauth2` auth method pointed at the other data centres' hosts, plus
widening `w6w.network.allow` to cover their API hosts.

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left. Only the second is something
the app itself performs.

### Is the vendor up?

**Service status** — Zoho's StatusIQ (Site24x7) page.

```
GET https://us.zohostatus.com/rss
```

Unlike most vendors in this pack, Zoho does not run Atlassian Statuspage — it runs Site24x7
StatusIQ, and publishes an RSS feed (not JSON) at `/rss`. The feed lists every Zoho product on one
page — Mail, Analytics, Bigin, CRM, and around a hundred more — as one item per component, titled
`"{component} - {status}"` (e.g. `"Zoho CRM -
Operational"`). `health/service.ts` declares this as a
`feed` check, finds the entry whose component name is exactly `"Zoho CRM"` (not `"Zoho CRM Plus"`, a
different product on the same page), and maps its status word onto our four states:

| StatusIQ status      | Mapped state |
| -------------------- | ------------ |
| Operational          | ok           |
| Under Maintenance    | degraded     |
| Degraded Performance | degraded     |
| Partial Outage       | degraded     |
| Major Outage         | down         |

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of the three
it performs itself.

```
GET /crm/v6/org
```

The cheapest authenticated call this app knows: it needs only the `ZohoCRM.org.READ` scope (included
in the default `oauth2` scope list) and returns the org's id and name, which `test` uses to confirm
the token works and `afterConnect` uses to fill `connectionLabel`.

### Do we have quota left?

Zoho meters usage in **API credits** against a rolling 24-hour window, not a simple per-day request
count — different endpoints cost different numbers of credits (a plain read costs 1; `lead-convert`
costs 5). Unlike HubSpot or Salesforce, Zoho does not return headroom on every response: the
`X-API-CREDITS-REMAINING` header only appears once usage crosses **50%** of the org's daily credit
allowance. Below that threshold the header is simply absent — `health/quota.ts` treats that absence
as "plenty of headroom" (`ok`) rather than `unknown`, and reports the header's value once it starts
appearing.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md). The
three questions above map onto declared checks like this:

| Key           | Kind       | Scope      | Credential | Severity      | Min interval | Probe                                               |
| ------------- | ---------- | ---------- | ---------- | ------------- | ------------ | --------------------------------------------------- |
| `service`     | service    | app        | none       | degraded      | 300s         | `health/service.ts` (feed)                          |
| `quota`       | quota      | connection | signed     | informational | 300s         | `health/quota.ts`                                   |
| `auth:oauth2` | credential | connection | signed     | fatal         | —            | derived from the `oauth2` auth method's `test` hook |

The host `us.zohostatus.com` (for `service`) is reachable **only inside that hook's worker** — not
from any action, and not from the other checks. The spec allows the widening precisely because the
check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host.

---

Researched and endpoint-verified 2026-08-02 against
`https://www.zoho.com/crm/developer/docs/api/v6/` (record CRUD, search, lead conversion) and
`https://www.zoho.com/crm/developer/docs/api/v8/` where the v6-specific page had moved (organization
details, multi-DC hosts, API credit limits — these are stable across versions). Status surfaces
move; re-check with `_tools/audit.ts` conventions in mind if a probe starts failing for everyone at
once.
