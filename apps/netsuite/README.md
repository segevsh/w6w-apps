# NetSuite

Records, SuiteQL queries and record transformations on **Oracle NetSuite** through the SuiteTalk
REST Web Services.

- **Categories** — finance, crm
- **Auth methods** — oauth2 (authorization code + PKCE, recommended), tba (OAuth 1.0a HMAC-SHA256,
  for existing integrations)
- **Actions** — 15
- **Health checks** — 3 (`service`, `account`, ~~`quota`~~) + the derived `auth:*` checks
- **Egress allowlist** — `*.suitetalk.api.netsuite.com` (the `service` check adds
  `status.netsuite.com` to its own hook allowlist, never to the app's)
- **Website** — https://www.netsuite.com/
- **API docs** — https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html
- **Status page** — https://status.netsuite.com/

> Verified 2026-10-05 against Oracle's REST Web Services help pages (record service, SuiteQL,
> `serverTime`, `governanceLimits`, OAuth 2.0 and TBA) and probes of `status.netsuite.com`. No live
> NetSuite account was available, so behaviour is verified against the documentation and mocked
> responses only. The icon is the "2024 NetSuite logo" from Wikimedia Commons (public domain, the
> Oracle NetSuite wordmark), embedded as a PNG inside `assets/icon.svg`; it is a wordmark, not a
> square glyph.

## Things most likely to go wrong

1. **Every account has its own host.** `https://<account>.suitetalk.api.netsuite.com`; a sandbox
   `1234567_SB1` is `1234567-sb1`. The account id is validated strictly and read from the
   connection's recorded display (`afterConnect`). That the hostname is the lowercase-hyphen form
   is Oracle convention, not stated on the REST pages themselves. `sign` refuses to attach
   credentials to any other host.
2. **Writes answer 204 with no body.** The new record's id is parsed from the `Location` header.
3. **Errors are classified from the body**, from `o:errorDetails[].o:errorCode`, never the status.
4. **SuiteQL** needs `Prefer: transient` (sent) and an `offset` that is a multiple of `limit`
   (refused locally otherwise). Bind values with `params` rather than splicing them into the query.
5. **TBA is being retired.** Oracle stops allowing new TBA integrations for REST from NetSuite
   2027.1 (support for existing ones tentatively ends 2028.2). Use OAuth 2.0 for anything new.
6. **Unverified live:** `eid:<externalId>` paths signed with TBA, and the unsigned response body of
   a real account (the `account` check passes on any NetSuite error envelope).

## Health checks

- `service` reads only the **SuiteTalk** group of the status page. That page has one component per
  data center, and the account's own data center is not knowable, so it reports `ok` or `degraded`
  naming the affected ones, never `down`.
- `account` sends an unsigned `serverTime` request to the account host; an error envelope is a pass.
  An unresolvable host (measured: a nonexistent account fails DNS) is `down`.
- `quota` is `unavailable` with `informational` severity: the limit is on concurrency and the only
  readable figure (`governanceLimits`) is admin-only. The Get Concurrency Limits action reads it.
- Credential probe: `GET /services/rest/system/v1/serverTime` — no permissions needed, no
  credential material in the response.

## Left out

Batch/bulk endpoints, record-specific convenience actions beyond customer and sales order,
item lookup, contact creation, file/attachment operations, async (`Prefer: respond-async`) jobs,
SuiteScript RESTlets and the SOAP API. Anything else is reachable with the generic record,
transform, action and SuiteQL actions.
