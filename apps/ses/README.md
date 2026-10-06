# Amazon SES

Send transactional, templated and bulk email through your own AWS account, and manage the
identities, templates, suppression list and contacts around it — Amazon SES **v2** REST API,
signed locally with AWS Signature Version 4.

- **Categories** — email, communication
- **Auth methods** — aws-iam (custom: access key ID + secret + region, optional session token)
- **Actions** — 23
- **Egress allowlist** — 29 regional endpoints `email.<region>.amazonaws.com` (commercial regions + GovCloud US). The manifest's `network.allow` takes exact hosts or a leading `*.` only, so a mid-string wildcard (`email.*.amazonaws.com`) is not expressible; the hosts are listed by name, as the S3 app does. FIPS (`email-fips.*`) and China are not included.
- **Website** — https://aws.amazon.com/ses/
- **API docs** — https://docs.aws.amazon.com/ses/latest/APIReference-V2/Welcome.html
- **Icon** — the AWS SES mark, verbatim from n8n's `nodes-base/nodes/Aws/SES/ses.svg`.

## Auth — AWS IAM Access Key

| Field | Type | Required | Notes |
|---|---|---|---|
| `accessKeyId` | secret | yes | IAM access key ID |
| `secretAccessKey` | secret | yes | IAM secret access key |
| `region` | string | yes | e.g. `us-east-1`. SES state (identities, templates, quota, suppression) is **per region**. |
| `sessionToken` | secret | no | Only for temporary STS credentials; sent as `x-amz-security-token` and signed. |

- **`sign`** computes SigV4 (`lib/sigv4.ts`, copied from the S3 app) for the signing name **`ses`**.
  Pure local HMAC, so it fits the network-less `sign` sandbox; the secret never leaves it.
- **`test`** calls `GET /v2/email/account` and reads the vendor's error *type*, not the status:
  `AccessDeniedException` passes (SigV4 verified, the key is real, the policy just omits
  `ses:GetAccount` — a send-only key is the usual least-privilege shape);
  `UnrecognizedClientException`, `InvalidSignatureException`, `ExpiredTokenException` fail.
- **`afterConnect`** echoes the non-secret `region` onto the Connection `display`, which is how
  actions choose the host without ever seeing the credential.

Minimum IAM actions: `ses:SendEmail` (send actions), `ses:GetAccount` (account/quota check),
`ses:ListEmailIdentities`/`GetEmailIdentity`/`CreateEmailIdentity`/`DeleteEmailIdentity`,
`ses:*EmailTemplate*`, `ses:*SuppressedDestination*`, `ses:ListConfigurationSets`,
`ses:ListContactLists`/`*Contact*` for the matching actions.

## Actions

| Group | Actions |
|---|---|
| Send | `send-email`, `send-templated-email`, `send-bulk-email` |
| Account | `account-get` |
| Identities | `identity-list`, `identity-get`, `identity-create`, `identity-delete` |
| Templates | `template-list`, `template-get`, `template-create`, `template-update`, `template-delete` |
| Suppression | `suppression-list`, `suppression-get`, `suppression-put`, `suppression-delete` |
| Configuration sets | `configuration-set-list` |
| Contacts | `contact-list-list`, `contact-search`, `contact-get`, `contact-create`, `contact-delete` |

List actions take `pageSize` / `nextToken` and return `nextToken` when more pages exist.
Responses keep SES's member names with the first letter lowercased (`MessageId` → `messageId`).
Recipients are comma-, semicolon- or newline-separated strings.

## Things that will bite you

- **The signing name is `ses`, the host is `email.…`.** Signing as `email` is a signature mismatch.
- **Canonical path is encoded twice** (every service except S3). An identity like `ada@example.com`
  is `…/identities/ada%40example.com` on the wire and `ada%2540example.com` in the canonical
  request; the S3 signer's single-encoding gives `SignatureDoesNotMatch` for any path that carries an
  `@`, `+` or `:`. `lib/sigv4.ts` branches on the service; the vectors are in `tests/lib/sigv4.test.ts`.
- **`send-bulk-email` returns 200 even when entries fail.** Each entry has its own `status`
  (`SUCCESS`, `MESSAGE_REJECTED`, `ACCOUNT_THROTTLED`, …); the action returns them with
  `successCount` / `failureCount` instead of throwing. Max 50 entries per call.
- **Template data is a JSON *string* on the wire** (max 256 KB); the actions accept an object and
  serialise it. `contact-create`'s `AttributesData` is the same.
- **Errors carry their type in the `x-amzn-ErrorType` header**, sometimes suffixed
  `:http://internal.amazon.com/…`; the body is just `{"message": …}`. A 400 covers validation,
  not-verified, already-exists and quota failures alike — the action's error text names the type.
- **Sandbox accounts** (`productionAccessEnabled: false`) can only send *to* verified identities and
  are capped at 200/day; `account-get` and the `quota` health check show it.
- **`template-update` replaces** the whole content; omitting `html` or `text` clears it.
- **List endpoints**: the docs document `GET /v2/email/identities` and `GET …/configuration-sets`;
  the service model additionally has `POST …/list-identities` / `list-configuration-sets` variants
  for larger filters. This app uses the documented GET forms.
- `SendEmail` takes no client token, so the send actions are not idempotent — a retry sends again.

Not covered yet: raw MIME (`Content.Raw`) and attachments, dedicated IPs and pools, configuration-set
CRUD and event destinations, VDM, deliverability dashboard, import/export jobs, email
validation, multi-region endpoints, tenants.

## Health checks

| Check | Kind | Source |
|---|---|---|
| `service` | service, unsigned | AWS public Health Dashboard `https://health.aws.amazon.com/public/currentevents`, filtered to the `ses-<region>` services (29 exist in `services.json`), reported per region as `components`. The body is UTF-16 with a BOM — read as bytes and decoded by hand. A feed failure is `unknown`, never `down`. |
| `quota` | quota, signed | `GET /v2/email/account`: `SendQuota` → `send-24h` and `send-rate` quotas; ≥ 90% of `Max24HourSend` is `degraded`, ≥ 100% or `SendingEnabled: false` is `down`; a non-positive cap is unmetered; `AccessDeniedException` is `unknown`. |
| `auth:aws-iam` | derived | the `test` hook above |

SES publishes no rate-limit response headers, so `GetAccount` is the only headroom signal.

## Verification

`deno task validate && deno task check && deno task lint && deno task test` — see the test suite for
the per-action request shapes (URL, method, body) and the AWS SigV4 vectors. A signed `GetEmailIdentity`
request with a made-up access key was sent to `email.us-east-1.amazonaws.com` on 2026-10-06 and was
answered `UnrecognizedClientException` — i.e. the `Authorization` header parsed — but a *valid*
signature was not exercised live (no AWS account was available).
