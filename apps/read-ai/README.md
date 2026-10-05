# Read AI

Read meeting reports from [Read AI](https://www.read.ai), the AI meeting assistant, over its public
REST API (`api.read.ai`, open beta). Id `io.w6w.read-ai`, app dir `read-ai`.

## Actions (4, all read-only)

| Key                 | Endpoint                       | Notes                                                           |
| ------------------- | ------------------------------ | --------------------------------------------------------------- |
| `list-meetings`     | `GET /v1/meetings`             | One page (max 10), newest first, `start_time_ms.*` window, `cursor`, `expand[]` |
| `list-all-meetings` | `GET /v1/meetings` (repeated)  | Walks the cursor up to a maximum (default 50, cap 500)          |
| `get-meeting`       | `GET /v1/meetings/{id}`        | `expand[]`: summary, chapter_summaries, action_items, key_questions, topics, transcript, metrics, recording_download |
| `get-live-meeting`  | `GET /v1/meetings/{id}/live`   | Live transcript / chapter summaries; `start_time_ms.gt`/`.gte` only |

## Auth: OAuth 2.1 only

Authorization code + PKCE with refresh tokens; Read AI offers **no static API key or client-credentials
grant** (static keys are listed as planned for GA). Endpoints, from
`https://authn.read.ai/.well-known/openid-configuration`: authorize `authn.read.ai/oauth2/auth`, token
`authn.read.ai/oauth2/token`, revoke `authn.read.ai/oauth2/revoke`. Scope `meeting:read` is what the API
needs; `offline_access` is required to get a refresh token.

There is no developer portal. The operator registers a client with Read AI's dynamic client registration
(`POST https://api.read.ai/oauth/register`, see the vendor's "API Keys & Authentication" article) and
configures the resulting `client_id`/`client_secret` on the w6w installation.

Things not confirmed (no credential was available): Read AI's guide registers the redirect URI
`https://api.read.ai/oauth/ui` and says to leave everything but `client_name` unmodified, so whether the
registration endpoint accepts a w6w callback URI is untested; and whether the token endpoint accepts the
credentials as `client_secret_basic` (what the guide registers) is up to the host's token exchange.
Access tokens last 10 minutes (`expires_in: 599`) and **refresh tokens rotate on every use**, so the host
must persist each new one.

## Network

`network.allow`: `api.read.ai` only. The OAuth host `authn.read.ai` is allowlisted implicitly; the status
probe declares `status.read.ai` on its own per-hook allowlist.

## Health checks

- `service` — Atlassian Statuspage at `status.read.ai` (verified real: page id `bqc0948459l6`, name
  "Read AI", unknown paths 404). The verdict is the `API` component; meeting-bot, sign-in and app
  components are reported but capped at `degraded`.
- `quota` — declared unavailable, `informational`: the only limit is 100 requests/minute per user
  (429), with no documented rate-limit header or usage endpoint.
- derived `auth:oauth2` from `test`, which probes `GET /v1/meetings?limit=1` (needs only
  `meeting:read`, returns no credential). Failures are classified from the body, not the status.

## Findings

- 401 has two bodies: no header gives `{"detail":"Not authenticated"}` (string); a bad token gives
  `{"detail":{"error":"invalid_token","error_description":…,"hint":…}}` (object).
- `limit` default and maximum are both 10; the cursor is the last item's `id`.
- Live data exists only if the live dashboard was open during the meeting. A workspace needs
  "Downloads" enabled (Workspace Settings > Reports & Sharing); users only see reports they can access.

## Deliberately left out

The docs describe only the three read endpoints above. Webhooks, audio/video upload, Ask Read and
coaching are stated to be unavailable via API, and `/mcp` (MCP server) is a different protocol. Nothing
here is inferred from them. The documented `/oauth/test-token-with-scopes` has no published response
shape, so it is not used.

## Icon

`assets/icon.svg` embeds the vendor's real 256x256 PNG logomark (from read.ai's `<link rel=icon>`)
verbatim as base64 — no SVG original is published. Format with `deno task fmt`, never bare `deno fmt`.
