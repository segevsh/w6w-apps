# Maileroo

Send transactional, templated and bulk email, read delivery logs, statistics, domains, suppressions,
templates and applications, and run OTP verifications with [Maileroo](https://maileroo.com).
28 actions.

Verified 2026-10-06 against the vendor's API reference (`maileroo.com/docs/api-reference/*`: Email
API, Account API, OTP Verification) and live unauthenticated probes of both API hosts. No
`deprecat`/`sunset`/`end of life` wording appears on any page read; the Email API is `/api/v2`, the
Account API `/v1`. The catalog's old link `maileroo.com/docs/email-api/introduction` is a 404; the
current pages live under `/docs/api-reference/emails/`.

## Auth: two credentials, one connection

Maileroo has two credential kinds, one per host. The single auth method **`api-keys`** holds both
(each optional) and the `sign` hook picks by the request host, so nothing in an action sees a key.

| Credential | Host | Sent as | Needed by |
|---|---|---|---|
| **Sending Key** | `smtp.maileroo.com` (Email API, `/api/v2`) | `X-Api-Key: <key>` (the API also accepts `Authorization: Bearer`) | `send-email`, `send-templated-email`, `send-bulk-emails`, `list-scheduled-emails`, `delete-scheduled-email` |
| **Account API Key** | `api.maileroo.com` (Account API + OTP Verification, `/v1`) | `Authorization: Bearer <key>` | every other action; each needs its own scope (named in the action description) |

Create a sending key under *Domains > (domain) > Sending Keys*, or by creating an *Application*
(an application-scoped key can send for several domains, and must name one in
`list-scheduled-emails`). The Account API Key carries granular scopes (`account.read`,
`domains.read`, `suppressions.write`, `verify.verifications.write`, ...) and an optional IP allowlist.
A key without a scope answers `403`, which the client reports with a scope hint. An action that needs
the key the connection does not hold fails with a message saying which one to add.

The connect-time `test` probes each key you supplied on its own host and classifies from the body:

- Sending key: `GET /api/v2/emails/scheduled`. A page, or an application-scoped key's
  `400 "...must provide a linked domain"`, both prove the key; `401` / "invalid API key" is a
  rejection.
- Account key: `GET /v1/account` (identity and plan; it never returns the key). A `403` naming a
  missing scope still proves the key is valid; a `403` about the IP allowlist, or a `401`, fails.

## Actions

| Group | Actions |
|---|---|
| Send (Sending Key) | `send-email`, `send-templated-email`, `send-bulk-emails` (up to 500 messages), `list-scheduled-emails`, `delete-scheduled-email` |
| Account | `get-account` (plan, hourly/monthly usage), `get-statistics-summary`, `get-statistics-timeline` |
| Logs | `search-email-logs` (account-wide, or one domain), `get-email-log` (stored raw message), `resend-email` |
| Domains | `list-domains`, `get-domain` (DNS records and status), `get-domain-analytics` |
| Suppressions | `list-suppressions`, `create-suppression`, `delete-suppression` |
| Templates / Applications | `list-templates`, `get-template`, `list-applications`, `get-application` |
| OTP Verification | `send-verification`, `check-verification`, `get-verification`, `list-verifications`, `cancel-verification`, `list-sender-profiles`, `get-sender-profile` |

Recipients (`to`, `cc`, `bcc`, `replyTo`) take a comma/newline separated string
(`Jane Smith <jane@example.com>, bob@example.com`), an array, or the vendor's
`{ address, display_name }` objects. `tags`, `headers`, `attachments`, `templateData` and bulk
`messages` are JSON. Local checks mirror the documented limits (subject 255 chars, 500 recipients,
24-char hex `referenceId`, 500 bulk messages) so a bad call fails before a request is made.

`send-*` and `delete-*` actions are not idempotent: the docs describe no de-duplication on
`reference_id`, so a retry sends a second email. `send-verification` is the exception: it forwards
the invocation id as the vendor's `Idempotency-Key`, so a retried step returns the existing
verification instead of texting the user twice.

## Health checks

| Check | What it does |
|---|---|
| `service` | **Declared unavailable**, informational. `status.maileroo.net` is a real Uptime.com page (linked from Maileroo's own `llms.txt`; it lists an "Email API" component) but publishes no machine-readable surface: `/api/v2/summary.json` and `/index.json` answer a bare openresty 404 and `/history.atom`, `/history.rss`, `/feed.rss` answer Uptime.com's own "Page Not Found" HTML. Component status exists only inside the rendered HTML, which is not scraped. |
| `api` | Unsigned GET to both hosts. Each host's schema-correct auth error (`{"error":{"message":...}}` from `api.maileroo.com`, `{"success":false,"message":...}` from `smtp.maileroo.com`) is a **pass**; a 5xx or network failure is `down`; a body in neither shape is `unknown`. |
| `quota` | Signed `GET /v1/account`: the Hourly and Monthly Outbound usage entries. `degraded` at 90% used, `down` when a limit is exhausted, unlimited (`quantity: -1`) is `ok`. A connection with only a Sending Key, or a key without `account.read`, reports `unknown`. |
| `auth:api-keys` | Derived from the Auth `test` hook. |

## Not covered (and why)

- **Credentials returned by the API.** `list-applications` / `get-application` omit the SMTP password
  and sending key the vendor includes, and sending-key listing/creation/rotation
  (`domain-sending-keys/*`), application create/update/rotate-secrets are not wrapped: a secret would
  land in run records. Manage them in the dashboard.
- **Account-management writes**: domain create/delete/settings/DNS scan, SMTP accounts, inbound routes,
  template create/update/delete, application create/update/delete, dedicated IPs, webhook management.
  Read pages for several were fetched but they are admin surface rather than workflow actions; they
  can be added without changing the auth model.
- **Webhooks and inbound routing** (event delivery to your endpoint): a trigger surface, not an action.
- **Sender profile and OTP webhook management** (create/update/delete): read-only here.
- **Email Testing Platform** (`/docs/api-reference/email-testing/*`): a separate product with its
  own getting-started pages; not covered.
- A plain-text part set to an *empty string* (to suppress the generated one) is not expressible:
  empty form values are treated as unset.

## Findings

- **Two hosts, two credentials, two envelope shapes.** The Email API is
  `smtp.maileroo.com/api/v2` with a per-domain/application sending key and answers
  `{success, message, data}` (errors `{success:false, message}`); the Account API is
  `api.maileroo.com/v1` with a scoped account key and answers `{data}` / `{error:{message}}`. A key
  for one host is rejected by the other, and the client reads both shapes.
- **"Email verification" is OTP delivery, not address validation.** The only verification API
  (`/v1/verify/*`) sends a one-time code by SMS, voice, WhatsApp, Telegram or email through a
  *sender profile* and checks what the user types; there is no endpoint that tests whether an
  arbitrary address exists. A wrong code is `200` with `status: "incorrect"`, not an error; only a
  code of the wrong length is a `400` (and costs no attempt). Sends spend a prepaid balance (`402`).
- **The auth error text is the only discriminator.** Unsigned, the Email API answers
  `You have used an invalid API key... 'X-API-Key' header` and the Account API `Please provide a
  valid API key in the Authorization header`; an application-scoped sending key with no `domain`
  gets a `400`, which is a *valid* key, so status alone would misread it.
- **Secrets ride list responses.** `GET /v1/applications` returns each application's SMTP password and
  sending key in the clear; this app drops them.
- Account API rate limit: 180 requests per minute per account (`X-RateLimit-*`, `Retry-After` on 429).
  Scheduling is capped at 21 days ahead and 25% of the monthly limit, and is not available on bulk.

## Develop

```bash
deno task fmt && deno task validate && deno task check && deno task lint && deno task test
```

The icon is Maileroo's own mark, the 180x180 `apple-touch-icon.png` served from `maileroo.com`.
