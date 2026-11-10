# Facebook Lead Ads

Read Facebook Lead Ads forms and their recent leads via the Facebook Graph API.

- **Categories** — marketing, social-media
- **Auth methods** — oauth2, page-token
- **Actions** — 2
- **Triggers** — 3 (1 webhook, 2 poll)
- **Egress allowlist** — `graph.facebook.com`
- **Website** — https://www.facebook.com/business/ads/lead-ads
- **API docs** — https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://metastatus.com>

Meta's status site covers the platform surfaces; there is no JSON API. The
developer-facing view lives at developers.facebook.com/status/dashboard.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The auth methods probe different endpoints:

| Auth method | Probe |
|---|---|
| `oauth2` | `GET /me` |
| `page-token` | `GET /me?fields=id,name` |

Resolves whoever the token belongs to — the user for the `oauth2` method, the Page
itself for `page-token`.

Both call `/me`; the Page-token method asks for fields explicitly because `/me` on a
Page token resolves to the Page rather than a user.

For diagnosing a token rather than just probing it, Graph's `GET
/debug_token?input_token=…` returns its type, scopes, expiry and owning app.

### Do we have quota left?

`X-App-Usage` and `X-Business-Use-Case-Usage` response headers carry percentage-of-quota
counters; Meta throttles when any reaches 100.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | informational | — | _declared absent_ |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |
| `auth:page-token` | credential | connection | signed | fatal | — | derived from the `page-token` auth method's `test` hook |

**`service` is declared absent.** Meta's status site (metastatus.com, and the developer view at developers.facebook.com/status/dashboard) is a human page with no JSON API or feed. The `quota` check reading `X-App-Usage` is the closest automatable proxy for platform health.
A declared absence always reports `unknown`, so it carries `severity: "informational"` —
otherwise it would pin every verdict for this app at `unknown` forever.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.

## Triggers

| Trigger | Mechanism | Vendor event | The run gets |
|---|---|---|---|
| `new-lead` — New Lead | webhook (manual, signed) | Page `leadgen` field: a Lead Ads form submission | lead ID, form, ad, ad set and Page IDs, created time |
| `new-lead-poll` — New Lead (poll) | poll | `list-recent-leads` (`GET /{form_id}/leads`, `filtering` on `time_created`, `limit=100`) | each new lead of the chosen form, with its answers (`field_data`) |
| `new-lead-form` — New Lead Ads Form | poll | `list-forms` (`GET /{page_id}/leadgen_forms`) | each lead form newly created on the chosen Page |

Meta's Page webhook field this app reacts to is `leadgen` (a lead was created); `new-lead` is therefore also the app's
only event trigger, so there is no separate Any Event trigger. Other Page fields (feed, mentions, ...) belong to
the Facebook Pages surface, not to Lead Ads.

`new-lead-poll` is the no-dashboard route to the same leads and carries what the webhook leaves out, the lead's
answers. Each check asks for the leads whose `time_created` is greater than the last check minus a two-minute
overlap (the documented `filtering=[{"field":"time_created","operator":"GREATER_THAN","value":<unix seconds>}]`
argument, exposed on `list-recent-leads` as `createdAfter`), three pages of 100 at most, following Graph's own `after`
cursor and resuming from it on the next check when the window holds more, and drops leads created before the
trigger's first check. The first check reads nothing and only records the time.

`new-lead-form` reads every page of `GET /{page_id}/leadgen_forms` (Graph documents no order or created-since
filter for it) and emits forms not seen before; a Page with more than 20 pages of forms fails the check with an
error naming the cap. The first check only records what exists.

The event carries the lead's ID, not its answers (that is what Meta sends); read the answers with the
**List Recent Leads** action for the same form.

The subscription is made by hand in the Meta app dashboard (a manual webhook), chosen as the default
receiver. Meta does offer `/{app-id}/subscriptions` (needs an app token, not this connection's token) and
`/{page-id}/subscribed_apps`, but this app does not call them. Meta allows one callback URL per app and
object, so one Meta app can feed only one w6w trigger per object (not verified here):

1. Create the trigger in w6w and paste your **App Secret** (App settings → Basic) and a **Verify Token**
   of your choosing into its parameters. The trigger shows its webhook URL.
2. In the Meta app dashboard → Webhooks, add a subscription for **Page** with that URL and the same
   verify token, then subscribe to the **`leadgen`** field (the app needs `leads_retrieval` and the Page subscribed).
3. Meta confirms the URL with a one-time `GET` carrying `hub.mode=subscribe`, `hub.verify_token` and
   `hub.challenge`; the trigger answers it with the challenge only when the verify token matches.

**Trust model.** Every delivery is verified against `X-Hub-Signature-256` (`sha256=` HMAC-SHA256 of the
exact request body, keyed with the App Secret) before anything is parsed. A missing or wrong signature,
a missing raw body, or an App Secret / Verify Token that was never configured refuses the delivery; the
host records one failed call and starts no run. The signed body carries only a send time (`entry[].time`), and Meta retries for
hours to days, so no replay window can be enforced; Meta retries unacknowledged deliveries, so a workflow may see an event twice.

Docs (verified 2026-11-10): https://developers.facebook.com/docs/graph-api/webhooks/getting-started ·
https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-pages

Lead Ads docs (verified 2026-11-10): https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving (Retrieving Leads, Filtering Leads), https://developers.facebook.com/docs/graph-api/results (paging), https://developers.facebook.com/docs/graph-api/reference/page/leadgen_forms/
