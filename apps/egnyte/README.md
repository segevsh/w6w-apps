# Egnyte

Browse, upload, share and search files and folders in Egnyte.

- **Categories** — storage, productivity
- **Auth methods** — access-token (OAuth 2.0 bearer token + your Egnyte domain)
- **Actions** — 19
- **Egress allowlist** — `*.egnyte.com`
- **Website** — https://www.egnyte.com
- **API docs** — https://developers.egnyte.com/docs (rendered at
  https://us-partner-integrations.egnyte.com/integration/cfs/api-docs)

`assets/icon.svg` is Egnyte's mark, downloaded **verbatim** from simple-icons
(`icons/egnyte.svg`). It is single-colour black, so `assets/icon.dark.svg` is the
same artwork re-inked white by `_tools/icon-legibility.ts fix` for the dark tile.

## Per-account host

Every Egnyte customer lives on `https://<domain>.egnyte.com/pubapi/...`. A manifest
cannot list those, so `network.allow` carries the wildcard `*.egnyte.com` (the same
model as the Freshdesk app). The **domain** is a field on the Connection;
`afterConnect` records it (with the token owner's `userinfo`) on the connection's
redacted `display`, and the client reads it from there — it never sees the token.

## Auth

Egnyte issues OAuth 2.0 tokens (30-day access tokens; revoked when the user changes
their password). This app stores a token and signs `Authorization: Bearer <token>`;
it does not run the authorization flow itself. Scopes are the token's business:
`Egnyte.filesystem` for files, `Egnyte.link` for links, `Egnyte.user` for users.

## Actions

| Resource | Actions |
| --- | --- |
| item | `item-get`, `item-get-by-id`, `item-move`, `item-copy`, `item-delete`, `search` |
| folder | `folder-create`, `folder-stats` |
| file | `file-upload`, `file-download`, `file-lock`, `file-unlock` |
| link | `link-create`, `link-list`, `link-get`, `link-delete` |
| user | `user-me`, `user-list`, `user-get` |

Paths are URL-encoded segment by segment (slashes kept), as Egnyte requires.
`file-upload` and `file-download` move content as text or base64 in memory.

### Not covered yet

Chunked upload (files over 100 MB), permissions, groups, metadata, audit reporting,
Egnyte's events/webhooks, user create/update/delete, and the AI/agent APIs. Writing
users and permissions is deliberately left out of a first cut.

## Health checks

Three different questions, kept apart:

- **Is the vendor up?** `service` reads <https://status.egnyte.com/api/v2/summary.json>
  (Atlassian Statuspage, page "Egnyte Platform"). The verdict is the worst of the
  two components both named **"Public APIs and Integrations"** (ids `7sflj4wg0f37`,
  `6zffx85n8z6n`, pinned by id because the name is not unique). The page-level
  indicator is *not* used: it rolls up Desktop App, Mobile, AI Services and more.
- **Is this account's host reachable?** `domain` (`credential: context`) sends an
  unsigned `GET /pubapi/v1/userinfo`. A **401 passes** — it proves the domain is
  serving. A domain that does not exist fails DNS, which is reported `down`.
- **Is this credential live?** The auth `test` hook: `GET /pubapi/v1/userinfo`,
  judged by the body (a `username` field), not the status alone. The probe returns
  the caller's identity, never the token.

## Verified against the live service

- `status.egnyte.com/api/v2/summary.json` → 200 JSON, schema above.
- `https://apidemo.egnyte.com/pubapi/v1/userinfo` with no or a bad token → 401 with
  `{"fault":{"faultstring":"Invalid access token","detail":{"errorcode":"oauth.v2.InvalidAccessToken"}}}`
  (an Apigee fault shape, not Egnyte's usual `errorMessage`).
- A non-existent `<domain>.egnyte.com` does not resolve.

Authenticated calls were not made against a live account: every request shape here
is taken from the vendor reference, not replayed.
