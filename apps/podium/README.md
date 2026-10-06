# Podium

Drive **Podium** (customer messaging, reviews, campaigns, appointments, phones and payments for
local businesses) from a workflow, over the Podium API v4 at `api.podium.com/v4`.

- **Auth** — OAuth 2 authorization-code (`oauth2`). Podium documents no other method.
- **Categories** — communication, marketing, crm
- **Network** — `api.podium.com` (actions, token and authorize endpoints); `status.podium.com`
  (the `service` health check only).
- **Actions** — 49: contacts, contact tags and attributes, conversations, messages, locations,
  organizations, users, reviews, feedback, calls, appointments, campaigns, templates, data-feed
  events and webhooks. Each action's description names the OAuth scope it needs.

## Getting credentials

Any developer can sign up at <https://developer.podium.com>, create an app (a `client_id`,
`client_secret` and an **https** redirect URI) and create free **test accounts** from the
developer dashboard — no partner contract is needed to build against it. Putting an app in front of
other Podium customers goes through Podium's app review (docs.podium.com/docs/oauth-scopes: scopes
are "the most common reason that apps aren't approved"). Configure the three values on the w6w
installation; the connect flow is the usual browser redirect.

Access tokens last **10 hours**; the refresh token is redeemed at the same `/oauth/token` URL.

### Scopes

The connection requests the scopes in Podium's scope table. Some endpoints name a scope that the
table does not list: `read_appointments` (appointment list/get), `read_phones` (call list/get),
`read_templates` (template list) and `write_campaigns` (campaign create) and `write_templates`. Add them to the
installation's scope list if you need those actions — Podium may reject an authorization that asks
for a scope your app has not been approved for, which is why they are not requested by default.
`webhook-*` actions need no scope for list/get/delete; create/update need the scope of each event
type subscribed to.

## Findings that shaped this app

1. **Part of the reference is another company's API.** The reference sidebar at
   docs.podium.com/reference also contains ~45 operations on unversioned paths (`/contacts`,
   `/conversations`, `/me`, `/labels`, `/inboxes`, `/channels`, `/files`…). Their OpenAPI says
   `servers: https://api.superchat.com/v1.0` with `X-API-KEY` auth — they are **Superchat's** API,
   misfiled into Podium's docs. Only the `/v4/...` operations are Podium's; this app uses none of the
   others.
2. **The docs host is a SPA; the real spec is one `.md` away.** `developer.podium.com/reference`
   serves an empty React shell and no `openapi.json`. `docs.podium.com` is ReadMe: append `.md` to
   any reference URL (e.g. `/reference/messagesend-1.md`) and the page's full OpenAPI document is
   inside it. Slugs are odd (`contactget-1`, `contact_tagcreate-2` is the *add* tag route while
   `contact_tagcreate-1` is the *delete*).
3. **Webhook objects echo the signing `secret`.** `GET /v4/webhooks[/{uid}]` and every write return
   the secret you set. The `webhook-*` actions strip it from their output; `secret` stays a write-only
   param.
4. **Writes answer 202 (queued), not 200,** for contacts, tags and deletes — a contact you just
   created may not be readable yet.
5. **A `cursor` overrides every other filter.** Podium ignores all other query parameters when a
   cursor is sent (the cursor carries its own filters), so page by sending the cursor alone.
6. **`podium-version` header.** Podium dates its API versions (`2021.04.01` appears in the sample
   response metadata) and defaults to the newest when no `podium-version` header is sent. This app does
   not send one, so it follows the latest behaviour.
7. **Rate limit** is 300 requests/minute on most routes, reported on every response (even a 401) as
   `ratelimit-limit` / `ratelimit-remaining` / `ratelimit-reset`; the `quota` check reads them.
8. **Bearer-token errors** are `{ "code": "unauthorized", "message": … }`; the auth `test` hook reads
   the body `code` and uses `GET /v4/webhooks`, the one list route that needs no scope.

## Health checks

| Check | Source | Verdict |
|---|---|---|
| `service` | `status.podium.com` — an **Instatus** page (not Statuspage): `/summary.json` + `/v2/components.json` | the `Public API` component; the page roll-up also covers the web app, mobile and phones, so it is detail only. Falls back to the page status if the component is renamed. |
| `quota` | `ratelimit-*` headers of a signed `GET /v4/webhooks` | remaining / limit for the minute window, informational |
| `auth:oauth2` | derived from the auth `test` hook | token accepted |

## Not covered

- `POST /v4/messages/attachment` (multipart upload), `POST /v4/import/messages`, product and image
  routes, invoices/refunds/payments/readers, SCIM user routes, contact-attribute *value* routes and
  conversation assignee/lead-writeback routes. The OAuth scope table also lists payments; the payment
  actions are left out because they need a card-reader or payments-enabled account to verify.
- Inbound webhook delivery and signature verification — this app only manages the subscriptions.

## Icon

`assets/icon.svg` embeds Podium's own `apple-touch-icon` (180x180 PNG, linked from podium.com's
`<link rel="apple-touch-icon">`) unchanged inside an SVG wrapper — Podium publishes no `favicon.svg`
and simple-icons / n8n carry no Podium mark.

## Develop

```
deno task validate && deno task check && deno task lint && deno task test
```
