# Formbricks

Manage Formbricks surveys, responses, contacts, action classes and webhooks from a workflow, over the
**Formbricks Cloud Management API** (v1).

- **Category** — forms (also marketing, analytics)
- **Auth methods** — `api-key` (an API key sent as the `x-api-key` header)
- **Actions** — 25
- **Health checks** — `service` (declared unavailable, informational), `api` (unsigned
  `GET /health`), `quota` (signed, `x-ratelimit-*` headers) + the derived `auth:api-key`
- **Egress allowlist** — `app.formbricks.com`
- **API docs** — https://formbricks.com/docs/api-reference/openapi.json (the Management API; the
  page index is https://formbricks.com/docs/llms.txt)
- **Icon** — simple-icons `formbricks.svg`, saved byte-for-byte as `assets/icon.svg`
  (`assets/icon.dark.svg` is the same path with a white fill, for dark tiles). The vendor's own
  `app.formbricks.com/favicon.ico` is a multi-size Windows ICO, which the manifest cannot use.

Everything here was verified on 2026-10-06 against the published OpenAPI document and live
unauthenticated probes of `app.formbricks.com`.

## Which API version

Built on **v1** (`/api/v1/...`). Formbricks also has a "v2" (`/api/v2/...`), but its documentation is
labelled **Beta** and the docs index lists only an introduction and a single client route under it;
no v2 OpenAPI document exists (`/docs/api-v2-reference/openapi.json` answers 404). v1 is the complete,
documented and current Management API and is not marked deprecated, so every action uses it.

## Self-hosted instances are not supported

The manifest can only declare fixed hostnames, and Formbricks is frequently self-hosted on a
customer's own domain. Covering that needs `network.allow: ["*"]`, which disables egress restriction
and is meant for user-supplied URLs; it is not done here. This app targets Formbricks Cloud
(`app.formbricks.com`). No EU-region host exists: `eu.formbricks.com` does not resolve, and the docs
name only `app.formbricks.com`.

## Things most likely to go wrong

1. **Environments were renamed to workspaces.** Bodies take `workspaceId`; the API still accepts
   `environmentId` as a deprecated alias, and responses already say `workspaceId`. Older docs, the
   Postman collection and a lot of blog posts still say environment. The `/api/v1/me` path in the
   "Test API Key" page 308-redirects to `/api/v1/management/me`, which is what this app uses.
2. **`/management/me` is the odd one out.** Every other route wraps its answer as `{ "data": ... }`;
   `me` returns a bare object, and its shape depends on the key: a single-workspace key gets
   `{ id, type, project|workspace, ... }`, an organization key gets
   `{ organizationId, environmentPermissions[], organizationAccess }`. The `me-get` action returns it
   as `{ me }`.
3. **Keys are scoped at creation and cannot be widened.** A key reaches only the workspaces added to
   it, each at read / write / manage, plus a separate Organization Access scope that grants no
   workspace data at all. A wrong-scope request is a `401 unauthorized`; a bad key is a
   `401 not_authenticated`. The credential test reads the body `code` for that reason, so a
   narrowly-scoped key still passes. Errors are `{ code, message, details }`.
4. **The rate limit is 100 requests/minute per key** (5/minute for the storage route) and is
   advertised on every response, including 401s: `x-ratelimit-limit: 100, 100;w=60`,
   `x-ratelimit-remaining`, `x-ratelimit-reset` (seconds). The first integer of the limit header is
   the limit. The `quota` check reads it from a signed `GET /management/me`.
5. **Response writes run the real pipeline.** `response-create` and `response-update` fire
   webhooks, integrations and, once finished, follow-up emails, exactly as for a real respondent.
   Answers are keyed by question ID, and the value shape depends on the question type.
6. **Surveys carry `questions` and `blocks`.** `questions` is the legacy form and is derived from
   `blocks`, so either may be read. The documented create/update body is `questions`-based; the many
   other survey fields (welcome card, hidden fields, triggers, styling, ...) are passed through the
   `fields` object on `survey-create` / `survey-update`, which the named params override.
7. **Only some lists page.** `response-list` takes `limit` / `skip`; the survey, contact, attribute,
   action-class and webhook lists document no pagination parameters, so none are sent.
8. **`/health` is real, `/status` is not.** `GET /health` answers `200 {"status":"ok"}`; an unknown
   path is a 404 HTML shell. There is no status page (see below).

## Actions

| Area | Actions |
| ---- | ------- |
| Key | `me-get` |
| Surveys | `survey-list`, `survey-get`, `survey-create`, `survey-update`, `survey-delete`, `survey-single-use-links` |
| Responses | `response-list`, `response-get`, `response-create`, `response-update`, `response-delete` |
| Contacts | `contact-list`, `contact-get`, `contact-attribute-list`, `contact-attribute-key-list`, `contact-attribute-key-get` |
| Action classes | `action-class-list`, `action-class-get`, `action-class-create`, `action-class-delete` |
| Webhooks | `webhook-list`, `webhook-get`, `webhook-create`, `webhook-delete` |

Every action returns Formbricks' `data` as `{ data }` (`me-get` returns `{ me }`).

## Not covered

- **The Public Client API** (`/api/v1/client/{workspaceId}/...`: displays, in-app responses, user
  identification, workspace state). It is unauthenticated and made for the browser/mobile SDKs, not
  for a server-side workflow.
- **`POST /management/storage`** (public file upload). It returns a signed S3 URL that the caller
  must then PUT to; that S3 host is not on this app's egress allowlist.
- **Inbound webhook delivery** itself: `webhook-create` registers an endpoint, the events are sent
  to you by Formbricks.
- **Self-hosted instances** (see above) and the organization/team endpoints, which the published
  document does not list.

## Health checks

- **`service`** — declared unavailable at `informational` severity. No status page is linked from
  the docs or site; `status.formbricks.com` answers 526 (invalid origin certificate) and the
  Instatus and Statuspage subdomains are unclaimed.
- **`api`** — unsigned `GET /health`; passes only on a `200` whose body is `{"status":"ok"}`.
- **`quota`** — signed `GET /management/me`, reads `x-ratelimit-limit` / `-remaining`; degraded at
  90% spent, down at zero. A 401 reads `unknown`, because the key's validity is the derived
  `auth:api-key` check's job. The headers were measured on unauthenticated 401s; their presence on
  authenticated responses is the documented per-key policy, not something a key-less probe could
  confirm, and absent headers read `unknown`, never `ok`.
