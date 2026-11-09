# Facebook Pages

Generic Facebook Graph API access: Pages, posts, comments, photos, videos, Page
insights, and read-only ad-account campaign listing.

- **Categories** — social-media, marketing
- **Auth methods** — oauth2, page-token
- **Actions** — 14
- **Triggers** — 2 (webhook)
- **Egress allowlist** — `graph.facebook.com`
- **Website** — https://developers.facebook.com/docs/pages/
- **API docs** — https://developers.facebook.com/docs/graph-api/

## Relationship to `facebook-lead-ads`

`packages/apps/apps/meta/facebook-lead-ads` already covers one narrow, named
surface of the Graph API — Lead Ads forms and their submitted leads
(`{page_id}/leadgen_forms`, `{form_id}/leads`). This app is the general-purpose
counterpart: everyday Page management (profile, posts, comments, media,
analytics) plus a deliberately thin read-only slice of the Marketing API. It
does **not** duplicate lead-ads' two actions, and does not read leads or
manage lead forms — connect `facebook-lead-ads` for that.

The `displayName` is **"Facebook Pages"** rather than a bare "Facebook",
specifically so the two apps read as distinct entries in a picker: this app is
scoped to what a Page (and, for one action, an ad account) can do — it is not
a general personal-profile client, and it is not a full Marketing API surface
(no ad set/ad/creative management, no bidding or spend writes).

## Actions

| Key | Type | Endpoint |
|---|---|---|
| `list-pages` | read | `GET /me/accounts` |
| `get-page` | read | `GET /{page-id}` |
| `list-posts` | read | `GET /{page-id}/feed` |
| `create-post` | perform | `POST /{page-id}/feed` |
| `get-post` | read | `GET /{post-id}` |
| `delete-post` | perform | `DELETE /{post-id}` |
| `list-comments` | read | `GET /{post-id}/comments` |
| `create-comment` | perform | `POST /{post-id}/comments` |
| `delete-comment` | perform | `DELETE /{comment-id}` |
| `list-photos` | read | `GET /{page-id}/photos` |
| `upload-photo` | perform | `POST /{page-id}/photos` (by `url`) |
| `list-videos` | read | `GET /{page-id}/videos` |
| `get-page-insights` | read | `GET /{page-id}/insights` |
| `list-ad-campaigns` | read | `GET /{ad-account-id}/campaigns` |

Every request — GET or write — sends its parameters as query-string
parameters, matching Graph API's own documented curl examples
(`POST /{page-id}/feed?message=...`); see `lib/client.ts`.

## Auth

Most endpoints above are Page-scoped and require a **Page** access token, not
a **User** token — Graph API rejects a User token on `{page-id}/feed`,
`{page-id}/photos`, `{page-id}/videos`, `{page-id}/insights`, and comment
moderation on a Page's own content. This app declares two Auth methods for
that reason (same split as `facebook-lead-ads`):

| Auth method | Token kind | Use for |
|---|---|---|
| `oauth2` | User | `list-pages` (enumerate managed Pages), and any Page-scoped action if the User token itself carries the matching `pages_*` scope |
| `page-token` | Page | Everything else — paste a long-lived Page access token |

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
itself for `page-token`. Both call `/me`; the Page-token method asks for fields
explicitly because `/me` on a Page token resolves to the Page rather than a user.

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

## API version

Pinned to Graph API **v23.0**. Checked 2026-08-02: the active version window ran
from v19.0 (sunsetting 2026-05-21) through the newly-shipped v26.0 (2026-07-29).
v23.0 sits in the middle of that window with a support runway well past v19/v20's
near-term sunset, and every endpoint this app calls is documented unchanged at that
version. Re-check `developers.facebook.com/docs/graph-api/changelog/versions/` and
bump `lib/client.ts#API_URL` as v23.0 approaches its own two-year sunset.

---

Researched and endpoint-verified 2026-08-02 against developers.facebook.com. Status
surfaces move; re-check with `_tools/audit.ts` conventions in mind if a probe starts
failing for everyone at once.

## Triggers

| Trigger | Mechanism | Vendor event | The run gets |
|---|---|---|---|
| `page-feed` — Page Feed Activity | webhook (manual, signed) | Page `feed` field: post, photo, video, comment or reaction added, edited, removed | item, verb, post / comment / parent IDs, sender, message, raw change |
| `new-comment` — New Comment | webhook (manual, signed) | Page `feed` field, `item=comment` and `verb=add` | the comment ID and text, its post and author |

Meta has no API to register a webhook for these events, so the subscription is made by hand in the
Meta app dashboard (a manual webhook):

1. Create the trigger in w6w and paste your **App Secret** (App settings → Basic) and a **Verify Token**
   of your choosing into its parameters. The trigger shows its webhook URL.
2. In the Meta app dashboard → Webhooks, add a subscription for ****Page**** with that URL and the same
   verify token, then subscribe to the **`feed`** field (and subscribe your app to the Page).
3. Meta confirms the URL with a one-time `GET` carrying `hub.mode=subscribe`, `hub.verify_token` and
   `hub.challenge`; the trigger answers it with the challenge only when the verify token matches.

**Trust model.** Every delivery is verified against `X-Hub-Signature-256` (`sha256=` HMAC-SHA256 of the
exact request body, keyed with the App Secret) before anything is parsed. A missing or wrong signature,
a missing raw body, or an App Secret / Verify Token that was never configured refuses the delivery; the
host records one failed call and starts no run. Meta's scheme carries no timestamp, so there is no
replay window; Meta retries unacknowledged deliveries, so a workflow may see an event twice.

Docs (verified 2026-11-09): https://developers.facebook.com/docs/graph-api/webhooks/getting-started ·
https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-pages
