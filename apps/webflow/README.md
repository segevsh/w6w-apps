# Webflow

Manage Webflow sites, CMS collections and items, products, and orders via the Webflow Data API v2.

- **Categories** — cms
- **Auth methods** — api-token, oauth2
- **Actions** — 14
- **Triggers** — 4 (webhook)
- **Egress allowlist** — `api.webflow.com`
- **Website** — https://webflow.com
- **API docs** — https://developers.webflow.com/

## Actions

All paths are relative to `https://api.webflow.com/v2`.

| Key | Resource | Method + path |
|---|---|---|
| `list-sites` | site | `GET /sites` |
| `get-site` | site | `GET /sites/{site_id}` |
| `list-collections` | collection | `GET /sites/{site_id}/collections` |
| `get-collection` | collection | `GET /collections/{collection_id}` |
| `create-item` | collection-item | `POST /collections/{collection_id}/items` (or `/items/live`) |
| `get-item` | collection-item | `GET /collections/{collection_id}/items/{item_id}` |
| `list-items` | collection-item | `GET /collections/{collection_id}/items` |
| `update-item` | collection-item | `PATCH /collections/{collection_id}/items/{item_id}` (or `/live`) |
| `delete-item` | collection-item | `DELETE /collections/{collection_id}/items/{item_id}` |
| `publish-items` | collection-item | `POST /collections/{collection_id}/items/publish` |
| `list-products` | product | `GET /sites/{site_id}/products` |
| `list-orders` | order | `GET /sites/{site_id}/orders` |
| `get-order` | order | `GET /sites/{site_id}/orders/{order_id}` |
| `update-order` | order | `PATCH /sites/{site_id}/orders/{order_id}` |

CMS items are nested under their collection (`/collections/{collection_id}/items/…`),
not under the site. The `create-item` / `update-item` `live` flag switches to the
`/live` variant that writes straight to the published site; otherwise the change stays
staged until `publish-items` (or a full site publish) promotes it.

## Auth

Two credential types, both signing with `Authorization: Bearer <token>`:

- **api-token** — a **site** API token generated under Site settings → Apps &
  integrations → API access. Scoped to that one site.
- **oauth2** — a Webflow App OAuth flow (client credentials live on the w6w server), able
  to span every site the user grants. Webflow separates scopes with a **space** and does
  not use PKCE.

## Triggers

| Trigger                   | Mechanism | Vendor event               | What the run gets                                      |
| ------------------------- | --------- | -------------------------- | ------------------------------------------------------ |
| `form-submission`         | webhook   | `form_submission`          | the form name, submitted fields and submission time    |
| `collection-item-created` | webhook   | `collection_item_created`  | the new CMS item, its collection and field data        |
| `collection-item-changed` | webhook   | `collection_item_changed`  | the updated CMS item and its field data                |
| `new-order`               | webhook   | `ecomm_new_order`          | the order, its status and the customer details         |

**Setup.** Set *Site ID*; optionally a *Collection ID* (CMS triggers) or *Form name* (form trigger)
to narrow it. The trigger registers the webhook itself (`POST /sites/{site_id}/webhooks`) and
removes it (`DELETE /webhooks/{id}`) when the subscription is deleted. With a **Site API token**
connection Webflow returns the webhook's own `secretKey`, which is kept in the subscription state.
With an **OAuth app** connection Webflow returns none and signs with the app's client secret, so
paste it as *OAuth app client secret*; registration fails (and the webhook is deleted again) if
neither is available. Webhooks made in the Webflow dashboard do not carry the signature headers
and cannot be used here.

**Trust model.** Every delivery must carry `x-webflow-signature`, the hex HMAC-SHA256 of
`<x-webflow-timestamp>:<raw request body>` under that secret, and a timestamp within five minutes
of now. Anything else is refused and starts no run. Webflow disables a webhook after repeated
failed deliveries; delete and re-add the trigger to register a new one.

Docs: <https://developers.webflow.com/data/docs/working-with-webhooks>, verified 2026-11-09.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — Atlassian Statuspage.

```
GET https://status.webflow.com/api/v2/summary.json
```

`summary.json` (not `status.json`) is a single request that also carries the
per-component breakdown — Data API, Hosted Websites, Site Pages, Webflow Canvas — so an
incident scoped to the Data API reports against `data-api` rather than greying out the
whole platform. The top-level `status.indicator` (`none`/`minor`/`major`/`critical`)
drives the rollup; each component's `status` maps through the Statuspage vocabulary.

The check is unsigned (`credential: "none"`) and `status.webflow.com` is reachable **only
inside this hook's worker** — it is deliberately absent from `w6w.network.allow`, so no
action can call it and no credential can ever reach the status host.

### Is this credential live?

This is what each Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself. Both methods probe:

```
GET /sites
```

Lists the sites the token can see; cheap and available to any token with `sites:read`.

### Do we have quota left?

`X-RateLimit-Limit` / `X-RateLimit-Remaining` response headers — a single request bucket
metered per minute (60 rpm on Starter/Basic sites, 120 rpm on paid plans). Read off the
same `GET /sites` probe. Webflow exposes no separate headroom endpoint, so absence of the
headers is reported as `unknown` rather than guessed at.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | 300s | `health/quota.ts` |
| `auth:api-token` | credential | connection | signed | fatal | — | derived from the `api-token` auth method's `test` hook |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `status.webflow.com` (for `service`) is reachable **only inside that hook's
worker** — not from any action, and not from the other checks. The spec allows the
widening precisely because the check is unsigned; pairing an extra host with
`credential: "signed"` is rejected at load time, so a credential can never reach a status
host.

---

Researched and endpoint-verified 2026-07-27. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
