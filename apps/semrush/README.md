# SEMrush

Read SEMrush backlink, referring-domain, anchor, competitor and keyword reports, and check the
account's remaining API units, on the current **v4 Standard API**.

- **Categories** — marketing, analytics, search
- **Auth methods** — api-key
- **Actions** — 13
- **Health checks** — 1 (`service`, `informational`) + the derived `auth:api-key`
- **Egress allowlist** — `api.semrush.com` (Standard API), `www.semrush.com` (the free API-units
  balance endpoint)
- **Website** — https://www.semrush.com/
- **API docs** — https://developer.semrush.com/api/v4/
- **Status page** — none published (see below)

> Everything below was verified live on 2026-09-22 against SEMrush's own v4 API reference
> (`developer.semrush.com/api/v4/...`) and `curl` probes against `api.semrush.com` and
> `www.semrush.com`. Nothing came from a third-party integration directory.

## The three things most likely to go wrong

### 1. Two hosts, two auth styles

The current v4 Standard API takes the key as an `Authorization: Apikey <key>` header — literally
`Apikey`, not `Bearer` or `ApiKey` — and that is the *recommended* form; a `?key=` query parameter is
also documented but deliberately not used here, for the usual reason (a workflow host logs request
URLs, not headers).

The one exception is the legacy, free API-units balance endpoint
(`www.semrush.com/users/countapiunits.html`), which documents **only** the `?key=` query form. Both
styles are built in the single `sign` hook (`auth/api-key.ts`), keyed off the request's own hostname,
so no Action ever has to know which one it needs.

### 2. The free endpoint echoes the key back on failure

`countapiunits.html` costs **zero** API units — every Standard-API report call costs real, paid
units, so it is the only sane place to put a credential-liveness probe or a health check without
billing the customer on every connection test. But its error body is:

```json
{"errors":[{"field":"key","message":"invalid api key: <the exact key that was sent>"}]}
```

confirmed live for an invalid key — the vendor echoes the submitted credential back into its own
error text. This is the same class of bug as Mailjet's `/apikey` and Follow Up Boss's `/me`, except
here it's the *error* path that leaks rather than a success body. `auth/api-key.ts`,
`lib/client.ts` and `actions/api-units-balance-get.ts` all read only `errors[0].field` to classify
the failure and never surface `errors[0].message`; a static message is returned instead. See
`tests/actions/api-units-balance-get.test.ts` for the regression test that pins this down.

### 3. No status page, no rate-limit headers

`semrush.statuspage.io` redirects to Atlassian's generic statuspage marketing page rather than
serving a real feed, and `status.semrush.com` does not resolve (DNS NXDOMAIN) — confirmed live
2026-09-22. `health/service.ts` declares that absence explicitly, as a `severity: "informational"`
check, per this pack's convention: an unsigned `GET` of `backlinks/v1/overview` is a **pass** when it
comes back with the documented `401` error envelope, since that proves the host parsed the request
and answered with its own documented shape — reachability, not credential liveness (that's the
derived `auth:api-key` check's job). No response from either host ever carried a rate-limit header,
so there is no `quota` check either.

## What's covered

The **Backlinks** family (overview, historical summary, individual links, referring domains,
referring IPs, linked pages, anchors, the authority-score distribution, competitors, multi-target
comparison and the backlink-gap matrix) and **Get Keyword Metrics** (volume, difficulty, CPC, SERP
features, 12-month trend) — the full documented surface of the v4 SEO Standard API as of 2026-09-22.
Plus the free API-units balance read.

## What's not covered

SEMrush's v4 docs also list a **Projects API** and a **Local API** (listing management, Google
Business Profile, Map Rank Tracker) — both deprecated/OAuth-flavoured or local-business-specific, and
out of scope for this app's first pass. The legacy v3 "Analytics API" (Domain Overview, Keyword
Overview, and dozens of other report types) still exists per SEMrush's own docs but is a separate,
much larger surface; not modelled here.
