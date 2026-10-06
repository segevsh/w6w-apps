# LinkupAPI

Run LinkedIn, WhatsApp and email outreach, lead sourcing, messaging, posting, recruiter and
email-enrichment calls through [LinkupAPI](https://linkupapi.com)'s V2 API
(`https://api.linkupapi.com/v2`). **54 actions.**

> Not to be confused with [Linkup](../linkup/README.md) (linkup.so), the web-search API.

## What it is, and a warning

LinkupAPI drives real LinkedIn (and WhatsApp / mailbox) accounts on the account holder's behalf
through managed proxies. LinkedIn's terms restrict automation of member accounts, and the vendor's
own best-practices page tells you to stay under LinkedIn's limits (about 80-100 invitations a day
on a paid account) and warns of account restrictions. The API is real and documented; whether to
point it at a given account is the account holder's call. Nothing here works around those limits.

## Auth

An API key sent as `x-api-key` (create one at app.linkupapi.com). Connect the LinkedIn account in
the LinkupAPI dashboard; LinkedIn credentials, cookies and 2FA codes are never handed to w6w. Use
**List Accounts** to get the `account_id` that nearly every action takes. The credential is only
ever read by `sign`. The check on connect is `GET /v2/credits`, which needs no account and returns
only a count.

## Actions

**account**

| Action | Type | Title |
|---|---|---|
| `account-get` | read | Get Account |
| `account-list` | read | List Accounts |
| `credits-get` | read | Get Credit Balance |
| `log-list` | read | List API Logs |

**recruiter**

| Action | Type | Title |
|---|---|---|
| `candidate-cv-get` | read | Get Candidate CV |
| `job-candidates-list` | read | Get Job Candidates |
| `job-close` | perform | Close Job Posting |
| `job-create` | perform | Create Job Posting |
| `job-list` | read | Get Job Posts |
| `job-publish` | perform | Publish Job Posting |

**content**

| Action | Type | Title |
|---|---|---|
| `comment-reply` | perform | Reply to Comment |
| `feed-get` | read | Get Feed |
| `post-comment` | perform | Comment on Post |
| `post-comments-list` | read | Get Post Comments |
| `post-create-company` | perform | Create Company Post |
| `post-create` | perform | Create Post |
| `post-get` | read | Get Post |
| `post-react` | perform | React to Post |
| `post-reactions-list` | read | Get Post Reactions |
| `post-repost` | perform | Repost |
| `post-search` | search | Search Posts |

**companies**

| Action | Type | Title |
|---|---|---|
| `company-get` | read | Get Company |
| `company-search` | search | Search Companies |

**network**

| Action | Type | Title |
|---|---|---|
| `connection-invite` | perform | Send Connection Request |
| `connection-list` | read | List Connections |
| `invitation-accept` | perform | Accept Invitation |
| `invitation-decline` | perform | Decline Invitation |
| `invitation-list` | read | List Invitations |
| `invitation-sent-list` | read | List Sent Invitations |
| `invitation-status-get` | read | Check Invitation Status |
| `invitation-withdraw` | perform | Withdraw Invitation |
| `network-recommendations-list` | read | Get Network Recommendations |

**messages**

| Action | Type | Title |
|---|---|---|
| `conversation-get` | read | Get Conversation |
| `inbox-list` | read | List Inbox |
| `message-send` | perform | Send Message or Email |

**enrich**

| Action | Type | Title |
|---|---|---|
| `email-find` | search | Find Email |
| `email-reverse` | read | Reverse Email Lookup |
| `email-validate` | read | Validate Email |

**profiles**

| Action | Type | Title |
|---|---|---|
| `people-search` | search | Search People |
| `profile-comments-list` | read | Get Profile Comments |
| `profile-contact-get` | read | Get Contact Info |
| `profile-get` | read | Get Profile |
| `profile-me` | read | Get My Profile |
| `profile-posts-list` | read | Get Profile Posts |
| `profile-reactions-list` | read | Get Profile Reactions |
| `profile-viewers-list` | read | Get Profile Viewers |
| `profile-visit` | perform | Visit Profile |

**webhooks**

| Action | Type | Title |
|---|---|---|
| `webhook-create` | perform | Create Webhook |
| `webhook-delete` | perform | Delete Webhook |
| `webhook-events-list` | read | Poll Webhook Events |
| `webhook-list` | read | List Webhooks |
| `webhook-start` | perform | Start Monitoring |
| `webhook-stop` | perform | Stop Monitoring |
| `webhook-update` | perform | Update Webhook |

Every action returns `{ data, creditsConsumed }`: the response envelope's `data` and its
`metadata.credits_consumed`. List-style inputs that the API takes as a string or an array
(location, industry, company, events, ...) accept several values separated by `;`.

## Health checks

| Check | What it reads |
|---|---|
| `service` | Declared unavailable (informational): LinkupAPI publishes no status page; `status.linkupapi.com` does not resolve. |
| `api` | Unsigned `GET /v2/credits`; the JSON `INVALID_API_KEY` 403 proves the API is answering. |
| `quota` | Signed `GET /v2/credits`: the credit balance (informational). |
| `auth:api-key` | Derived from the auth test. |

## Not covered

Left out because the reference does not pin them down or they handle LinkedIn credentials:
connect account (`/v2/login`) and checkpoint (2FA), delete account, set proxy country, Typeahead,
Check InMail / InMail seat / InMail balance, WhatsApp number check, email mailbox management
(`manage-emails`, autoconfig), attachment download, webhook secret rotation, replay and the SSE
stream, and API log export and stats. Base64 file attachments are not exposed; attach by URL.

## Verified, and not

Paths, verbs, action names and fields come from the V2 reference pages indexed by
`docs.linkupapi.com/llms.txt`, and every category path was probed on 2026-10-06 (all answer a JSON
`INVALID_API_KEY` 403 to a bad key). No real account was available, so response shapes are the
documented ones and no action was exercised against live data.

Things that cost a day if missed:

- The published `docs.linkupapi.com/openapi.json` is **V1** (`/v1/...`, a `login_token` per
  request, slated for deprecation). V2 has no OpenAPI, only pages.
- The overview says email enrichment is `POST /v2/mail`; that is a 404. The live route is
  `POST /v2/enrich`, and it takes no `account_id`.
- A missing or bad key is **403** `INVALID_API_KEY`, not 401; failures are read from
  `{success:false, error:{code}}`.

The mark is the vendor's own `docs.linkupapi.com/favicon.svg`, verbatim.
