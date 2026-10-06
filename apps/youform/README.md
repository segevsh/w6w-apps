# Youform

Read Youform forms and submissions, manage submission webhooks and enable submission refill links
over Youform's REST API (`https://app.youform.com/api`).

- **Auth:** API token (`Authorization: Bearer <token>`), created at
  [app.youform.com/account](https://app.youform.com/account) → API Tokens. Available on every plan,
  Free included.
- **Network:** `app.youform.com` only.
- **Icon:** `assets/icon.svg` is Youform's own sunflower mark, byte-for-byte from
  `https://youform.com/assets/images/sunflower-favicon.svg` (the site's `<link rel="icon"
  type="image/svg+xml">`).
- **Reference:** Youform's [Postman collection](https://www.postman.com/navigation-cosmologist-99507396/workspace/youform/collection/21094175-e04cd7f9-1c88-471b-849b-0aba7be6c811)
  (what `youform.com/api-docs` redirects to), read through Postman's public collection JSON, and
  every route confirmed live (unsigned `401 {"message":"Unauthenticated."}`).

## Actions (7)

| Action | Verb and path |
|---|---|
| `account-get` | `GET /api/me` |
| `form-list` | `GET /api/forms` |
| `form-get` | `GET /api/forms/{slug}` |
| `submission-list` | `GET /api/forms/{slug}/submissions` (`is_complete`, `sort_by`, `sort_by_order`, `per_page` ≤ 100, `page`) |
| `webhook-create` | `POST /api/webhooks?form_id=…&webhook_url=…` |
| `webhook-delete` | `DELETE /api/webhooks/{id}` |
| `submission-refill-link-set` | `POST /api/submissions/{id}/refill-link` with `{"enable": …}` |

This is the whole public API. Youform's help centre states it cannot create or edit forms, so there
are no such actions.

## Things that bite

- **Forms are addressed by slug**, the code in the share link (`kyir3qrg`), not the numeric `id`
  the responses also carry. Webhook creation's `form_id` query parameter is also the slug.
- **Lists are a Laravel paginator nested under `data`**: rows are at `data.data`, not `data`.
  Submission answers are keyed by block id — read `form-get` to map them to question titles.
- **Free plans must not send `is_complete`**: they get completed submissions by default and
  `is_complete=false` answers HTTP 400. The action omits it unless you set it.
- **`webhook-create` takes query parameters, not a body**, requires an `https://` URL, and Youform
  posts a test payload on save — a non-2xx reply saves the webhook disabled. It is not idempotent.
- The refill-link endpoint documents no response body; it is returned verbatim.

## Health checks

| Check | What it does |
|---|---|
| `api` | Unsigned `GET /api/me`; a `401 {"message":"Unauthenticated."}` is the **pass**. 404, 5xx or a non-JSON body is `down`. |
| `service` | Declared unavailable (informational): Youform publishes no status page — `status.youform.com` does not resolve and `youform.com/status` is a 404. |
| `quota` | Declared unavailable (informational): no rate-limit headers or quota endpoint. |
| `auth:api-token` | Derived from `test`: `GET /api/me`, whose response (`id`, names, email) never echoes the token. |

## Not covered

Webhook listing, signing-secret management, webhook delivery logs and form creation/editing are
not in Youform's API.

## Develop

```bash
deno task validate && deno task check && deno task lint && deno task test
deno task fmt        # never bare `deno fmt`
```
