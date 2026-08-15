# Zoho Mail

Send, search and manage email in Zoho Mail — messages, folders, labels and accounts.

Scoped to **Zoho Mail specifically**. This pack already ships `zoho` (Zoho CRM), a separate product
with a separate API surface (`www.zohoapis.com`, `/crm/v6/...`) — do not confuse the two, and do not
modify `apps/zoho/` from here.

- **Categories** — communication, email
- **Auth methods** — oauth2, one per Zoho data centre (see below)
- **Actions** — 16
- **Egress allowlist** — `mail.zoho.com`, `mail.zoho.eu`, `mail.zoho.in`, `mail.zoho.com.au`,
  `mail.zoho.jp`, `mail.zoho.com.cn`, `mail.zohocloud.ca`, `mail.zoho.sa`
- **Website** — https://www.zoho.com/mail
- **API docs** — https://www.zoho.com/mail/help/api/

## Actions

| Resource | Actions                                                            |
| -------- | ------------------------------------------------------------------- |
| Account  | list, get                                                          |
| Folder   | list, create                                                       |
| Label    | list, create                                                       |
| Message  | send, list, search, get (metadata), get content, get headers, mark read/unread, move, apply label, delete |

`account-list`/`account-get` are the only OAuth-scope-`READ` actions; everything else needs the
`folders`/`messages`/`tags` scopes this app's `oauth2` methods always request (see below).

Zoho's own `updatemessage` endpoint covers several more single-email operations beyond move/apply
label — archive, flag, mark spam — behind the same `mode` parameter. This app implements the ones
that came up first (read/unread, move, apply label); the rest are additive if a workflow needs them,
following the same `PUT .../updatemessage` shape `lib/client.ts` already wraps.

## Regional data centres (all eight, unlike this pack's `zoho` CRM app)

Zoho hosts every account in one of **eight** regional data centres — United States, Europe, India,
Australia, Japan, China, Canada, Saudi Arabia — each with its own OAuth host
(`accounts.zoho.<tld>`) and its own Mail API host (`mail.zoho.<tld>`). An account only exists on one
data centre, and its OAuth authorization/token endpoints are **not interchangeable** across them — an
EU-hosted account cannot complete an authorization request sent to `accounts.zoho.com`.

Because the OAuth host is baked into the authorization flow itself (the browser is redirected to a
specific `accounts.zoho.<tld>` before any in-flow field could be read), a single `oauth2` auth method
with a "data centre" selector cannot express this — RFC `auth.md`'s `oauth2.authorizationUrl` /
`tokenUrl` are static per method. So `auth/oauth2.ts` declares **one `AuthDefinition` per data
centre** instead (`oauth2-us`, `oauth2-eu`, `oauth2-in`, `oauth2-au`, `oauth2-jp`, `oauth2-cn`,
`oauth2-ca`, `oauth2-sa`) — the user picks the method matching their account's data centre when
connecting, and `w6w.network.allow` lists every corresponding API host so any of the eight can be
used. All sixteen hosts (eight `accounts.zoho.<tld>` OAuth hosts, eight `mail.zoho.<tld>` API hosts)
were probed live on 2026-08-15:

- every `mail.zoho.<tld>/api/accounts` answered `400 {"data":{"errorCode":"INVALID_TICKET","moreInfo":"Invalid ticket"}}` unauthenticated — the documented shape, not a catch-all;
- every `accounts.zoho.<tld>/oauth/v2/auth` answered `302` (redirect to the Zoho login page) for a
  syntactically valid authorize request.

Each `oauth2-<region>` method's `afterConnect` records that region's fixed `apiHost` on the
connection unconditionally, plus the authenticated user's primary `accountId` /
`primaryEmailAddress` when reachable — `lib/client.ts#apiHostFromConnection` and `#accountIdFrom`
read them back, so most actions never need an explicit `accountId` param (`account-list` exists for
the case a connection genuinely sees more than one mailbox).

## Health check

Three different questions get confused with each other, so this section keeps them apart: is the
_vendor_ up, is _this credential_ live, and do we have _quota_ left.

### Is the vendor up?

**Service status** — Zoho's StatusIQ (Site24x7) page, the same platform this pack's `zoho` (Zoho CRM)
app reads.

```
GET https://us.zohostatus.com/rss
```

`https://status.zoho.com/api/v2/summary.json` redirects (301) to
`https://us.zohostatus.com/api/v2/summary.json`, which itself answers `404` — Zoho does not run
Atlassian Statuspage for Mail (or CRM). The RSS feed lists every Zoho product on one page — Mail,
Analytics, Bigin, CRM, and around a hundred more — as one item per component, titled
`"{component} - {status}"`. `health/service.ts` declares this as a `feed` check and finds the entry
whose component name is exactly `"Zoho Mail"` — **not** `"Zoho Mail-IMAP"`, `"Zoho Mail-POP"` or
`"Zoho Mail-SMTP"`, three separate protocol components on the same page that do not cover the REST
API this app calls (confirmed live: all four components exist simultaneously, independently
reported).

| StatusIQ status      | Mapped state |
| --------------------- | ------------ |
| Operational           | ok           |
| Under Maintenance     | degraded     |
| Degraded Performance  | degraded     |
| Partial Outage        | degraded     |
| Major Outage          | down         |

### Is this credential live?

This is what each `oauth2-<region>` method's `test` hook does — the app's own health check, and the
only one of the three it performs itself, derived per region into `auth:oauth2-us`,
`auth:oauth2-eu`, etc.

```
GET /api/accounts
```

The cheapest authenticated call this app knows: it needs only the always-requested
`ZohoMail.accounts.READ` scope and returns nothing secret. Classified by the vendor's own
`errorCode`, not by HTTP status alone — confirmed live against `mail.zoho.com`:

| Request                                  | HTTP | `errorCode`         | Meaning                                   |
| ----------------------------------------- | ---- | -------------------- | ------------------------------------------ |
| No `Authorization` header at all          | 400  | `INVALID_TICKET`     | No usable token reached the request        |
| `Authorization: Zoho-oauthtoken garbage`  | 401  | `INVALID_OAUTHTOKEN` | The token is syntactically present but dead |

Two different problems with two different fixes — collapsing them into one bare 4xx would misreport
one as the other.

### Do we have quota left?

**Declared unavailable.** Zoho Mail's API documentation index links no rate-limit or credit endpoint
(unlike Zoho CRM's `X-API-CREDITS-REMAINING`), and a live unauthenticated
`GET https://mail.zoho.com/api/accounts` carries no `X-RateLimit-*` (or similarly named) response
header at all — checked 2026-08-15. `health/quota.ts` states this as a positive absence with
`severity: "informational"` (required — an `unavailable` check always reports `unknown`, which
outranks `ok`, so any other severity would pin the App's verdict at `unknown` forever) rather than
leaving a silent gap.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key                    | Kind       | Scope      | Credential | Severity      | Min interval | Probe                                                    |
| ----------------------- | ---------- | ---------- | ---------- | -------------- | ------------ | --------------------------------------------------------- |
| `service`               | service    | app        | none       | degraded       | 300s         | `health/service.ts` (feed)                                 |
| `quota`                 | quota      | —          | —          | informational  | —            | ~~declared unavailable~~ (`health/quota.ts`)                |
| `auth:oauth2-<region>`  | credential | connection | signed     | fatal          | —            | derived from each region's `oauth2-<region>` `test` hook (8) |

The host `us.zohostatus.com` (for `service`) is reachable **only inside that hook's worker** — not
from any action, and not from the other checks. The spec allows the widening precisely because the
check is unsigned; pairing an extra host with `credential: "signed"` is rejected at load time, so a
credential can never reach a status host.

## Findings worth a day saved

1. **The error envelope is not Zoho CRM's.** Zoho CRM's error body is flat
   (`{"code","message","status"}`); Zoho Mail's is nested under `data`
   (`{"data":{"errorCode","moreInfo"?},"status":{"code","description"}}`) — confirmed live against
   `mail.zoho.com/api/accounts`. Two Zoho products, same `Zoho-oauthtoken` scheme, different error
   shapes. `lib/client.ts#formatZohoMailError` reads the Mail shape specifically.
2. **Half the `updatemessage` responses carry no `data` key at all.** Mark-read, move and apply-label
   all answer `{"status":{"code":200,"description":"success"}}` on success — no `data`. Treating a
   missing `data` as a parse failure would break every one of those actions; `ZohoMailClient.request`
   returns `undefined` instead of throwing.
3. **The OAuth data-centre problem has no single-method fix.** See "Regional data centres" above —
   this is the trap that would otherwise silently restrict the app to one of eight data centres (as
   this pack's `zoho` CRM app documents doing, deliberately, for a different reason: CRM offers no
   way to retarget the API host post-connect the way Mail's fixed `mail.zoho.<tld>` per region does).

---

Researched and endpoint-verified 2026-08-15 against `https://www.zoho.com/mail/help/api/` (the
index, 95,001 bytes) and every per-endpoint page it links to for the surface this app implements,
plus live probes against all eight `mail.zoho.<tld>` and `accounts.zoho.<tld>` host pairs and
`us.zohostatus.com`. Status surfaces move; re-check with `_tools/audit.ts` conventions in mind if a
probe starts failing for everyone at once.
