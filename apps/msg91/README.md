# MSG91

Send SMS, one-time passwords, email and WhatsApp messages through [MSG91](https://msg91.com), the
Indian CPaaS, and read delivery reports, from a workflow.

- **App id:** `io.w6w.msg91` · **Categories:** `communication`, `marketing` · **Host:**
  `control.msg91.com` (v5 API, `/api/v5`)
- **Auth:** `authkey` — an MSG91 account auth key, sent as the `authkey` **header** (never in a URL).
  Find it in the MSG91 dashboard (account menu > Authkey). If the account has IP whitelisting on,
  w6w's egress address must be allowed.
- Every path, verb, parameter and body field was read from the vendor's reference
  (`docs.msg91.com`, one page per endpoint) and checked with unsigned / garbage-key probes of the
  live host on 2026-10-06. The reference carries no deprecation or sunset notice, and v5 is the
  version every current page documents.
- **Not live-tested with a real key.** No MSG91 account was available, so response shapes for
  success cases are taken from the reference's sample responses, not from a measured call.

## Actions (16)

| Key | Type | What it does |
|---|---|---|
| `email-logs` | read | Delivery logs for emails sent through MSG91 over a window of at most 3 days. |
| `email-send` | perform | Send an email from an MSG91 email template through a verified sending domain, with template variables. |
| `email-templates-list` | search | List the email templates in your MSG91 account, optionally filtered by name or status. |
| `email-validate` | read | Check whether an email address is deliverable, disposable, a free-mail or a role address. |
| `otp-logs` | read | Delivery logs for OTP messages over a window of at most 3 days. |
| `otp-resend` | perform | Resend the same OTP to the number it was first sent to, by text or voice call (MSG91 allows 2 retries). |
| `otp-send` | perform | Generate and send a one-time password by SMS from an MSG91 OTP template. MSG91 stores it for Verify OTP. |
| `otp-verify` | perform | Check an OTP the user typed against the one MSG91 sent. Returns verified true/false; a rejected key or bad input fails the step. |
| `sms-analytics` | read | Delivery analytics for SMS sent in a date range (at most 31 days, starting no earlier than 2024-01-01). |
| `sms-send` | perform | Send an SMS from a DLT-approved MSG91 template (flow) to one or many numbers, with per-recipient variables. |
| `whatsapp-balance-get` | read | Read the prepaid balance and plan status for an integrated WhatsApp number. |
| `whatsapp-logs` | read | Message logs for WhatsApp traffic over a window of at most 3 days. |
| `whatsapp-message-send` | perform | Send a free-form text message to a user who has already messaged you (an open WhatsApp session). Use Send WhatsApp Template to start a conversation. |
| `whatsapp-numbers-list` | read | List the WhatsApp numbers integrated with your MSG91 account. |
| `whatsapp-template-send` | perform | Send an approved WhatsApp template message from an integrated number to one or many recipients. |
| `whatsapp-templates-list` | search | List the WhatsApp templates linked to an integrated number (MSG91 returns at most 500). |

Categories for the pack README table: **Communication** (SMS / OTP / WhatsApp / email).

## Things worth knowing

- **Failures come back as HTTP 200.** The SMS/OTP family answers `{"type":"error","message":…}` with
  status 200 for a wrong template, an expired OTP, a retry cap and a rejected key alike; the
  email/WhatsApp/report family answers a real 401 `{"status":"fail","hasError":true,…}`. The client
  reads the body: any `type: "error"`, `hasError: true`, `status: "fail"` or `error` string fails the
  step with the vendor's own message.
- **Verify OTP returns a result, not an error, for a wrong code.** `OTP not match` / `OTP expired`
  become `verified: false` with the message; a rejected key or bad input still fails the step.
- **The key is not checked first.** `POST /flow` and `POST /otp` with a garbage key answer "The
  provided flow ID or template ID is invalid.": template validation runs before the credential, so
  that message does not mean the key is good.
- **Reports are windowed.** Logs: at most 3 days, start date within the last 3 days. SMS
  analytics: at most 31 days, from 2024-01-01.
- **Numbers** are international, digits only (`919876543210`). The actions strip `+`, spaces and
  dashes.
- **SMS needs DLT.** For India the template ID must be a DLT-registered MSG91 template; variable
  names are case-sensitive and must match the template's `##name##` placeholders.
- OTP retry documents `authkey` as a query parameter; this app sends the header on every call so
  the key never lands in a URL. If MSG91 rejects the header form on that one endpoint, the symptom
  is an "Invalid authkey" error from `otp-resend` alone.

## Health checks

| Check | Kind | What it does |
|---|---|---|
| `service` | service (declared unavailable, informational) | MSG91 publishes no usable status page. `status.msg91.com` answers 200 for every path (`/`, `/api/v2/summary.json`, `/index.json`, `/history.atom`, `/feed.rss`) with Atlassian's own Statuspage marketing page after a redirect (127,696 bytes, the catch-all signature); `msg91.statuspage.io` answers 401 "Your page is inactive"; `msg91.com/status` is a 404; no page links one. |
| `api` | dependency, unsigned | `GET /whatsapp/whatsapp-activation/` with no credential. A schema-correct JSON `{"status":"fail","hasError":true,"errors":"Unauthorized"}` 401 proves the API is serving (the response is JSON served as `text/html`, so the body is parsed, never the content-type). 5xx is `down`; HTML or anything else is `unknown`. An unknown path is a 404 `{"type":"error","msg":"Route Missing"}`, so the 401 is the auth layer. |
| `quota` | quota (declared unavailable, informational) | No rate-limit header and no account-wide credit endpoint is documented. The one documented balance call is WhatsApp-only and needs an integrated number, so it is the `whatsapp-balance-get` action. |
| `auth:authkey` | derived from `test` | Signed `GET /otp/verify?otp=0000&mobile=910000000000`, a verification of a number never sent an OTP. It needs no template, DLT registration or WhatsApp/email product, changes nothing and never echoes the key. Classified from the **body**: HTTP 200 `{"message":"Invalid authkey","type":"error","code":"201"}` (or "Auth Key missing", or a 401 `Unauthorized` envelope) is a rejection; any other JSON envelope is an accepted key. The body a valid key gets for an unknown number was not measurable without a key. |

## Not covered (and why)

Left out because the reference page does not pin the behaviour or the surface is outside this app's
slice, not because it was impossible:

- **SMS Logs.** The reference page says `POST` while its sibling OTP, email and WhatsApp logs pages
  say `GET` for the same `report/logs/p/…` family, and an unauthenticated probe cannot tell which is
  right (both answer the same 401). Use `sms-analytics`, or add it once the verb is confirmed with a
  key.
- **SMS balance.** The reference documents no SMS/OTP credit-balance endpoint (the legacy
  `balance.php` is not in the v5 docs), so none is offered.
- **WhatsApp non-text in-session messages** (image, video, reaction, location), interactive
  buttons/lists, product catalogs, payments, groups, template create/edit/delete, WhatsApp voice
  call and analytics.
- **SMS template management** (add / versions / mark default), **OTP template edit**, **OTP
  analytics**, **email template create / CSS inliner / analytics / Handlebars send**.
- **Voice, RCS, Segmento contacts and events, Campaigns, Hello (helpdesk), sub-accounts, the OTP
  widget and OneAPI flows.**
