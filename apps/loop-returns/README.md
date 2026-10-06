# Loop Returns

Drive [Loop Returns](https://www.loopreturns.com) (the Shopify returns and exchanges platform) from a
workflow, over the Loop API v1 at `https://api.loopreturns.com/api/v1`.

- App id: `io.w6w.loop-returns` — categories `commerce`, `support`
- Auth: **API key**, sent as the `X-Authorization` header (not `Authorization`). Create it in
  Loop Admin > Settings > Integrations > API. Each key carries scopes; an action whose scope the key
  lacks is refused by Loop.
- Network: `api.loopreturns.com` only.
- Rate limit: 300 requests per minute per key; Loop answers `429` beyond it.
- Spec source: Loop's OpenAPI 3.1 documents at `https://docs.loopreturns.com/openapi/*.yaml`
  (index: `https://docs.loopreturns.com/llms.txt`), read 2026-10-06. No deprecation or sunset notice
  appears in any of them.
- Icon: `https://www.loopreturns.com/icon0.svg` (the vendor's own SVG, a PNG embedded as a data URI).

## Actions (30)

| Area | Actions | Scope |
| --- | --- | --- |
| Returns | `return-list`, `return-get`, `return-process`, `return-cancel`, `return-flag`, `return-close`, `return-remove-line-items`, `return-notes-list`, `return-note-create`, `return-asn-report`, `return-label-generate` | Returns |
| Deep links | `return-deep-link-create`, `return-qr-create` | Orders |
| Fraud | `fraud-report-create`, `fraud-report-delete` | Returns |
| Orders | `order-list`, `order-get`, `order-get-by-external-id`, `order-return-eligibility` | Orders |
| Customers | `customer-list`, `customer-get`, `customer-get-by-external-id`, `customer-upsert` | Customers |
| Destinations | `destination-list`, `destination-get` | Destinations (Read) |
| Webhooks | `webhook-list`, `webhook-create`, `webhook-delete` | Developer Tools |
| Labels | `label-request-list` | Label Requests (Read) |
| Bulk operations | `bulk-operation-list` | Bulk Operations (Read) |

List actions prefill a small page size (25) and expose `nextCursor` (cursor lists) or `offset`
(label requests).

## Things worth knowing

- **Failures arrive with HTTP 200.** Cancel, flag, close, remove and process answer `true` on success
  and `{"errors": {"message": …}}` with status 200 on refusal; return details answers
  `{"error": {"message"}}` with 200 when nothing matches. The client decides from the body, and
  raises the vendor's message.
- **`return-process` only queues.** `success: true` means Loop accepted the work. Confirm the outcome
  with the `return.closed` or `return.processing.failed` webhook.
- **Four error envelopes** coexist: `{"error": {"http_code": "GEN-UNAUTHORIZED", …}}` (gateway),
  `{"errors": "…"}`, `{"errors": {"message": …}}` and `{"errors": [{"message": …}]}`, plus Laravel's
  `{"message", "errors": {field: [...]}}` on 422.
- **Refund returns:** pass every line item id to `return-remove-line-items` in one call; removing one
  at a time fails because the first call closes the return.
- `return-list` always sets `paginate=true`; without it Loop returns a bare array. Without `from`/`to`
  it covers only the last 24 hours, and a window may span at most 120 days.

## Health

- `auth:*` (derived from the connection test): signed `GET /warehouse/return/list?paginate=true&pageSize=1`.
  Loop documents no ping or whoami; this is the cheapest read under the Returns scope. A pass needs a
  `returns` array; a rejection is recognised from the body ("Unauthorized.") rather than the status.
  The list holds customer data, so it is never read into a message.
- `api`: unsigned `GET /webhooks`; the gateway's schema-correct JSON 401 (`GEN-UNAUTHORIZED`) proves it
  is serving. An HTML body is `unknown`, a 5xx is `down`.
- `service`: declared unavailable (informational). `status.loopreturns.com` is a real status.io HTML
  page with no JSON/Atom/RSS feed (`/api/v2/summary.json`, `/index.json`, `/history.atom`,
  `/feed.rss`, `/history.rss` all answer an HTML 404).
- `quota`: declared unavailable (informational). Rate-limit headers exist but there is no usage endpoint.

## Not covered

Order create/update/upsert/delete (large nested bodies), customer update/patch/delete, destination
create/update/delete, label create/update-status and label-request errors (carrier-integration
surface), webhook update, the webhook sample endpoint, bulk-operation create (multipart upload), bulk
operation get/jobs, and the Products, Collections, Inventories, Listings, Locations, Draft Returns,
Carts, Checkout+, Dispositioning, Ship-by-Loop, HQ and Happy Returns APIs. Loop's OAuth2 flow
(`developer_tools` scope) covers only the webhooks API and is not used; the API key works for it too.
