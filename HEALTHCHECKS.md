# Health checks

Every app in this pack answers three separate questions, and they are worth keeping
apart when something breaks:

1. **Is the vendor up?** An out-of-band status service. Nothing in an app calls it —
   status hosts are not on any app's egress allowlist — but it is the first thing to
   check when every connection for one vendor fails at once.
2. **Is this credential live?** The Auth `test` hook. This is the app's own health
   check, and the only one it performs itself.
3. **Do we have quota left?** Usually response headers rather than an endpoint.

Per-app detail, including why each probe was chosen over the obvious alternatives, is in
`apps/<app>/README.md`. This table is the index.

| App | Vendor status | Machine-readable? | Credential probe | Quota headroom |
|---|---|:-:|---|:-:|
| [airtable](apps/airtable/README.md) | [Statuspage](https://status.airtable.com/api/v2/status.json) | yes | `GET /v0/meta/whoami` | no |
| [anthropic](apps/anthropic/README.md) | [Statuspage](https://status.anthropic.com/api/v2/status.json) | yes | `GET /v1/models` | yes |
| [asana](apps/asana/README.md) | [Statuspage](https://status.asana.com/api/v2/status.json) | yes | `GET /api/1.0/users/me` | no |
| [bitbucket](apps/bitbucket/README.md) | [Statuspage](https://bitbucket.status.atlassian.com/api/v2/status.json) | yes | `GET /2.0/user` | yes |
| [brevo](apps/brevo/README.md) | [Statuspage](https://status.brevo.com/api/v2/status.json) | yes | `GET /v3/account` | yes |
| [contentful](apps/contentful/README.md) | [Statuspage](https://www.contentfulstatus.com/api/v2/status.json) | yes | `GET /spaces/{spaceId}` | yes |
| [discord](apps/discord/README.md) | [Statuspage](https://discordstatus.com/api/v2/status.json) | yes | `GET /users/@me` | yes |
| [dropbox](apps/dropbox/README.md) | [Statuspage](https://status.dropbox.com/api/v2/status.json) | yes | `POST /2/users/get_current_account` | no |
| [eventbrite](apps/eventbrite/README.md) | [page](https://status.eventbrite.com) | no | `GET /v3/users/me/` | yes |
| [facebook-lead-ads](apps/facebook-lead-ads/README.md) | [page](https://metastatus.com) | no | _varies by method_ | yes |
| [github](apps/github/README.md) | [Statuspage](https://www.githubstatus.com/api/v2/status.json) | yes | `GET /user` | yes |
| [gmail](apps/gmail/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | `GET /gmail/v1/users/me/profile` | no |
| [google-calendar](apps/google-calendar/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | `GET /users/me/calendarList?maxResults=1` | no |
| [google-docs](apps/google-docs/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | _varies by method_ | no |
| [google-drive](apps/google-drive/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | _varies by method_ | no |
| [google-sheets](apps/google-sheets/README.md) | [JSON](https://www.google.com/appsstatus/dashboard/incidents.json) | yes | _varies by method_ | no |
| [hubspot](apps/hubspot/README.md) | [Statuspage](https://status.hubspot.com/api/v2/status.json) | yes | `GET /account-info/v3/details` | yes |
| [jira](apps/jira/README.md) | [Statuspage](https://jira-software.status.atlassian.com/api/v2/status.json) | yes | _varies by method_ | no |
| [klaviyo](apps/klaviyo/README.md) | [Statuspage](https://status.klaviyo.com/api/v2/status.json) | yes | `GET /api/accounts/` | yes |
| [linear](apps/linear/README.md) | [page](https://status.linear.app) | no | `POST /graphql  ·  { viewer { id } }` | yes |
| [mailchimp](apps/mailchimp/README.md) | [page](https://status.mailchimp.com) | no | `GET /3.0/ping` | no |
| [mistral](apps/mistral/README.md) | [RSS](https://status.mistral.ai/feed.rss) | yes | `GET /v1/models` | yes |
| [notion](apps/notion/README.md) | [page](https://status.notion.so) | no | `GET /v1/users/me` | no |
| [openai](apps/openai/README.md) | [Statuspage](https://status.openai.com/api/v2/status.json) | yes | `GET /v1/models` | yes |
| [salesforce](apps/salesforce/README.md) | [JSON](https://api.status.salesforce.com/v1/instances) | yes | _varies by method_ | yes |
| [sendgrid](apps/sendgrid/README.md) | [Statuspage](https://status.sendgrid.com/api/v2/status.json) | yes | `GET /v3/scopes` | yes |
| [shopify](apps/shopify/README.md) | [Statuspage](https://www.shopifystatus.com/api/v2/status.json) | yes | `GET /shop.json` | yes |
| [slack](apps/slack/README.md) | [JSON](https://status.slack.com/api/v2.0.0/current) | yes | `POST /api/auth.test` | no |
| [stripe](apps/stripe/README.md) | [JSON](https://status.stripe.com/current) | yes | `GET /v1/balance` | no |
| [telegram](apps/telegram/README.md) | none published | no | `GET /bot{token}/getMe` | no |
| [trello](apps/trello/README.md) | [Statuspage](https://trello.status.atlassian.com/api/v2/status.json) | yes | `GET /1/members/me` | no |
| [twilio](apps/twilio/README.md) | [Statuspage](https://status.twilio.com/api/v2/status.json) | yes | `GET /2010-04-01/Accounts/{accountSid}.json` | no |
| [wordpress](apps/wordpress/README.md) | none published | no | `GET /wp-json/wp/v2/users/me` | no |
| [zendesk](apps/zendesk/README.md) | [page](https://status.zendesk.com) | no | `GET /api/v2/users/me.json` | yes |
| [zoom](apps/zoom/README.md) | [Statuspage](https://status.zoom.us/api/v2/status.json) | yes | `GET /v2/users/me` | yes |

## What the research turned up

- **17 of 35 vendors use Atlassian Statuspage**, so one client handles them all:
  `GET https://<host>/api/v2/status.json` → `status.indicator` of `none` / `minor` /
  `major` / `critical`. `summary.json` adds components and open incidents.
- **Four run their own JSON APIs**, each shaped differently: Slack
  (`/api/v2.0.0/current`), Stripe (`/current`, which reports `api` and `webhooks`
  separately — the API can be healthy while webhooks are degraded), Salesforce Trust
  (per-*instance* status, which is the granularity that actually matters), and Google
  Workspace (an incident feed rather than a current-state rollup).
- **Six publish nothing machine-readable** — Notion, Linear, Mailchimp, Zendesk,
  Eventbrite and Meta — and **Telegram publishes nothing at all**. For those, the
  credential probe is the only automatable signal.
- **Two vendors ship a purpose-built health endpoint**: Mailchimp's `GET /3.0/ping` and
  Dropbox's `POST /2/check/user` echo. Everyone else is probed with a whoami.
- **GitHub's `/rate_limit` is the best-designed probe of the set** — it is documented as
  not counting against the rate limit, works unauthenticated, and reports quota in the
  same call.
- **Salesforce's `/limits` answers questions 2 and 3 at once**, which is why it is the
  probe rather than an identity call.

## Choosing a probe

The recurring trap is picking an endpoint that needs a scope the credential may not
have — it reports a perfectly good token as broken. Two cases in this pack:

- HubSpot's OAuth and private-app methods probed `/crm/v3/objects/contacts`, so a
  private app entitled to deals but not contacts failed its own health check. Now
  `/account-info/v3/details`, which needs no object scope.
- Shopify is probed with `/shop.json` rather than `/products.json` (which n8n uses and
  which 403s without `read_products`), and Stripe with `/v1/balance` rather than
  `/v1/charges`.

So, in order of preference: a dedicated ping endpoint; else a whoami that needs no
scope; else the cheapest read the narrowest usable credential can still perform.
