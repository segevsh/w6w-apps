# Workday

Workday HCM over the **Workday REST API**: workers, jobs, organizations, absence and time off, person
contact information and time tracking, plus one write (request time off). 25 actions across five
services, per tenant, as the Integration System User behind a Workday API client.

Verified 2026-10-05 against the Workday REST Services Directory
(`community.workday.com/sites/default/files/file-hosting/restapi/index.html`) and the Swagger 2.0
documents it publishes per service (`<service>_v<N>_20261003_oas2.json`). Every path, parameter and
response field below comes from those documents. No tenant was available, so **nothing here has been
run against a live Workday tenant**.

## Connecting

One auth method, `refresh-token` (a `custom` method). In Workday:

1. Run the task **Register API Client for Integrations**; tick **Non-Expiring Refresh Tokens**; pick the
   functional-area scopes the actions you use need (Staffing, Time Off and Leave, Organizations and Roles,
   Time Tracking, Person Data, Jobs & Positions). Save to get the client ID and secret.
2. On the API client, run **Manage Refresh Tokens for Integrations** to generate the refresh token for the
   Integration System User.
3. Give this app: **host** (your data-center services host, e.g. `wd2-impl-services1.workday.com`,
   `wd5-services1.myworkday.com`, `services1.wd503.myworkday.com`), **tenant**, client ID, client secret and
   refresh token.

`exchange` and `refresh` POST `https://{host}/ccx/oauth2/{tenant}/token` with `grant_type=refresh_token`
and the client authenticating with HTTP Basic (`client_id:client_secret`), then store the short-lived
access token; `sign` stamps `Authorization: Bearer`. The token URL is per tenant, so the platform's stock
`oauth2` type (one static token URL) cannot express it. `sign` is network-less by design, so the exchange
runs in the hooks that may call `ctx.fetch` rather than in `sign` itself; `sign` also refuses to attach the
bearer to any host other than the connection's own, and leaves the token request's own Basic header alone.

**Host is validated, not trusted.** The credential is posted to it, so the host must be a bare hostname of
the form `label(.label)*.workday.com` or `.myworkday.com` (neither apex; no scheme, port, path or userinfo)
or the connection is refused. The manifest allowlist is exactly `*.workday.com` and `*.myworkday.com`.
Tenant names are limited to letters, digits, `_` and `-`; path IDs are validated and percent-encoded.

### Unconfirmed

- **Access-token lifetime.** The directory does not state one. The app uses `expires_in` when the token
  response carries it and otherwise assumes one hour, expiring two minutes early.
- **Refresh token not rotated.** Workday's non-expiring refresh token is reused as-is; if a tenant ever
  returns a new `refresh_token`, it is not picked up.
- **The `common` service URL prefix.** The four other specs declare `basePath: /<service>/<version>`, which
  with Workday's `/ccx/api` prefix and the tenant gives `https://{host}/ccx/api/{service}/{version}/{tenant}`.
  The `common` spec declares `basePath: /api/common/v1`, which does not fit that form, and no document
  reachable without a tenant gives its real prefix. This app uses `/ccx/api/v1/{tenant}` (Workday's
  long-published form for the Common API). It is one line (`SERVICE_PATH.common` in `lib/client.ts`); the 5
  actions that use it are the Common v1 rows below. Confirm on a tenant before relying on them.
- The `ccx/api/{service}/{version}/{tenant}` form itself is stated by the task brief, not by a Workday
  document that could be fetched.

## Actions

Collections page with `limit` (1-100, Workday default 20) and a zero-based `offset`, and return
`{ items, count, total, hasMore }`. Single reads return `{ record }`. Worker IDs accept a 32-hex Workday ID,
a reference ID such as `Employee_ID=21001`, or `me`.

| Service | Action | Endpoint |
| --- | --- | --- |
| Staffing v7 | `worker-list` | `GET /workers` (search, email, includeTerminated, filterByOrgVisibility) |
| Staffing v7 | `worker-get` | `GET /workers/{ID}` |
| Staffing v7 | `worker-service-dates` | `GET /workers/{ID}/serviceDates` |
| Staffing v7 | `job-list` / `job-get` | `GET /jobs`, `GET /jobs/{ID}` |
| Staffing v7 | `job-profile-list` | `GET /jobProfiles` |
| Staffing v7 | `job-family-list` | `GET /jobFamilies` |
| Staffing v7 | `supervisory-organization-list` / `-get` | `GET /supervisoryOrganizations[/{ID}]` |
| Common v1 | `worker-direct-report-list` | `GET /workers/{ID}/directReports` |
| Common v1 | `worker-organization-list` | `GET /workers/{ID}/organizations` |
| Common v1 | `worker-managed-organization-list` | `GET /workers/{ID}/supervisoryOrganizationsManaged` |
| Common v1 | `worker-history-list` | `GET /workers/{ID}/history` |
| Common v1 | `organization-list` | `GET /organizations` (organization type required) |
| Absence Management v5 | `absence-balance-list` | `GET /balances` (`worker` required) |
| Absence Management v5 | `time-off-detail-list` | `GET /workers/{ID}/timeOffDetails` |
| Absence Management v5 | `eligible-absence-type-list` | `GET /workers/{ID}/eligibleAbsenceTypes` |
| Absence Management v5 | `leave-of-absence-list` | `GET /workers/{ID}/leavesOfAbsence` |
| Absence Management v5 | `valid-time-off-date-list` | `GET /workers/{ID}/validTimeOffDates` |
| Absence Management v5 | `time-off-request` (perform, not idempotent) | `POST /workers/{ID}/requestTimeOff` |
| Person v4 | `person-get` | `GET /people/{ID}` |
| Person v4 | `person-work-email-list` / `-phone-` / `-address-` | `GET /people/{ID}/workEmails`, `workPhones`, `workAddresses` |
| Time Tracking v7 | `time-total-list` | `GET /workers/{ID}/timeTotals` |

Requesting time off is Workday's documented three-step flow: `eligible-absence-type-list` (the `id` is the
time off type), `valid-time-off-date-list`, then `time-off-request`. The request sends
`businessProcessParameters.action = Submitted` (`d9e4223e446c11de98360015c5e6daf6`) unless `submit` is off,
and `wd-warning-action: updateonwarning` only when `acceptWarnings` is on. Each day needs `date`,
`dailyQuantity` and `timeOffType`.

## Left out

- **Job changes and other staffing business processes** (`POST /workers/{ID}/jobChanges`,
  `organizationAssignmentChanges`): each is a multi-call process (create, ~15 section PATCHes, submit)
  whose section bodies need a tenant to verify. Not shipped.
- Home contact information (home emails, phones, addresses) and contact-information *changes*
  (`homeContactInformationChanges`, `workContactInformationChanges`); `GET /people` listing; legal and
  preferred name sub-resources; photos.
- Time-off corrections (`correctTimeOffEntry`), time clock events, worker time blocks, time attestations,
  skills, check-ins.
- Services not covered at all: recruiting, compensation, payroll, expense, procurement, projects,
  learning, talent management, student, Prism, WQL, custom objects, and the SOAP Workday Web Services.
- Worker pay slips, inbox tasks and time-off plans/entries from the Common service.

## Health

- **Service status: declared unavailable, `informational`.** Workday publishes no machine-readable status.
  `status.workday.com` and `trust.workday.com` 301 to `community.workday.com/trust/status`, which redirects
  to a SAML sign-in (login-gated); the Statuspage-style paths on the status host take the same redirect.
  Availability is also per tenant and data center.
- **Credential check:** `Auth.test` calls Staffing `GET /workers?limit=1`. 200 passes; 401 fails; 403 is
  reported as authenticated but unable to read workers (a Workday 403 is "authenticated, not permitted").
  The body holds a worker's name, never a credential.

## Icon

`assets/icon.svg` is the Workday logo from Wikimedia Commons
(`Special:FilePath/Workday_logo.svg`, file `Workday logo.svg`, credited to Brands of the World, categories
"Workday, Inc." and "With trademark"), used byte-for-byte (10,867 bytes). It is a trademark of Workday, Inc.
