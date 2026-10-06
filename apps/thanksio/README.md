# thanks.io

Send handwritten-style direct mail — postcards, letters, notecards, Magnacards and gift cards — from
a workflow, manage the mailing lists they go to, price an order before placing it, and follow it to
delivery.

Built on the v2 OpenAPI (`https://docs.thanks.io/api-reference/openapi.json`, server
`https://api.thanks.io/api/v2`). The v1 Postman collection is deprecated and not used.

## Every send spends real money

The six `send-*` actions and `order-replay` **place an order, charge the account and mail a physical
piece**. There is no idempotency key, so every one is marked non-idempotent: a retry places a second
order. While building:

- Use **Estimate Order** (`estimate-order`). It takes the same inputs as a send and "charges nothing,
  prints nothing, creates no order". Its response carries `test_mode`.
- Set **Preview only** on a send to get a preview instead of an order.
- Turn on thanks.io's **API Testing Mode** for the account. While it is on, orders placed through the
  API are **cancelled**, so nothing is mailed. It is not free everywhere: buying a radius search is not
  an order, is charged in full, and is limited to 5 records per purchase in test mode.

## Auth

`bearer` — a personal access token from the thanks.io dashboard (**API Access**), sent as
`Authorization: Bearer <token>`. thanks.io also offers OAuth2; this app does not wire it.

## Actions (25)

| Group | Actions |
|---|---|
| Send (spends money) | `send-postcard`, `send-notecard`, `send-magnacard`, `send-windowed-letter`, `send-windowless-letter`, `send-giftcard`, `order-replay` |
| Price (free) | `estimate-order` (postcard, windowed/windowless letter, notecard, magnacard, giftcard) |
| Orders | `order-list`, `order-track`, `order-items-list`, `order-cancel` |
| Mailing lists | `mailing-list-list`, `mailing-list-get`, `mailing-list-create`, `mailing-list-recipients-list` |
| Recipients | `recipient-create`, `recipient-get`, `recipient-update`, `recipient-delete`, `recipients-create-multiple` |
| Catalogue | `handwriting-style-list`, `giftcard-brand-list`, `image-template-list`, `message-template-list` |

A send takes an **audience** (one of `mailingListIds`, `recipients`, `radiusSearch`; none is refused
before any call), the creative (`imageTemplateId` / `frontImageUrl`, `message` / `messageTemplateId`),
handwriting options, a return address, `metadata` (returned unchanged by the order endpoints and in
every webhook event) and an `extra` JSON object merged into the body for any documented field not
surfaced as a param (for example a send date). Responses return `orderId`, `status` and the vendor's
full `order`.

Lists answer with `data` / `links` / `meta`; this app returns `links` and `meta` so a workflow can follow
the next page. `mailing-list-recipients-list` is a bare Laravel paginator and returns `nextPageUrl`.

## Health checks

- `service` — **declared unavailable** (informational). No vendor status page: `status.thanks.io` does
  not resolve and the API reference links to none.
- `api` — unsigned `GET /mailing-lists/`. A schema-correct `401 {"message":"Unauthenticated."}` proves
  the API and its auth layer are answering, so it is a **pass**; 5xx is down; anything else is unknown.
- `quota` — **declared unavailable** (informational). There is no balance or usage endpoint; responses
  carry `x-ratelimit-limit: 120` / `x-ratelimit-remaining` only.
- `auth:api-token` — derived from the auth `test` hook: signed `GET /mailing-lists/?items_per_page=1`,
  judged by the documented `data` array and the vendor's error body, not the status code.

## Findings that shape the code

- **Some endpoints are public.** `/handwriting-styles` and `/giftcard-brands(-list)` answer `200` with no
  token and with a bogus one, so neither can be a credential probe. `/mailing-lists/` is the probe.
- **The documented error and the live error differ.** The OpenAPI says `403 Unauthorized`; the live API
  answers `401 {"message":"Unauthenticated."}`. Errors are classified from the body.
- **`/giftcard-brands-list` is documented as a bare array but answers `{"brands":[…]}`.** Both are
  accepted.
- **Error bodies have four shapes** (`message`; `status`+`message` on replay; Laravel `errors` on 422;
  `402` when API access is disabled after payment failures). All are folded into one readable message.
- **Bulk create names its list key differently.** The vendor's `create-multiple` example uses
  `mailing_list`, single create uses `mailing_list_id`. The bulk array is passed through verbatim.

## Left out

Not built, to stay within what was confirmed: sub-account CRUD, message-template create/update/delete,
webhook CRUD (paid plans only), radius-search purchase (charged per record; the free
`count-radius-search` is also not wired), `delete-by-address`, `invalidate-giftcard`, and
`build/image-template`.

## Development

```bash
deno task fmt && deno task validate && deno task check && deno task lint && deno task test
```
