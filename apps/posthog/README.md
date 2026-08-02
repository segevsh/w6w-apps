# PostHog

Capture analytics events and query persons, cohorts, feature flags, insights and annotations via
PostHog.

- **Categories** — analytics
- **Auth methods** — personal-api-key
- **Actions** — 8
- **Egress allowlist** — `us.posthog.com`, `eu.posthog.com`, `us.i.posthog.com`, `eu.i.posthog.com`
- **Website** — https://posthog.com
- **API docs** — https://posthog.com/docs/api

## PostHog has two structurally different APIs — and two structurally different keys

This is the single most important thing to get right about this app, so it is stated up front and
enforced by the code, not just documented:

| | App/query REST API | Ingestion/capture API |
|---|---|---|
| Purpose | Read/write everything about a project (persons, cohorts, flags, insights, annotations, …) | Write analytics events |
| Hosts | `us.posthog.com` / `eu.posthog.com` | `us.i.posthog.com` / `eu.i.posthog.com` |
| Path shape | `/api/projects/{project_id}/...` | `/i/v0/e/` |
| Key | **Personal API Key** — private, account-scoped bearer token | **Project API Key** — public, per-project token (`phc_...`) |
| Sent as | `Authorization: Bearer <key>` | `api_key` field in the JSON body — **no** Authorization header |
| Trust model | Must be kept secret | Deliberately public — the same key PostHog ships inside every `posthog-js` snippet in a customer's own frontend |

Confirmed live 2026-08-01 against `https://posthog.com/docs/api` and
`https://posthog.com/docs/api/capture`: the capture docs state requests must go to
`us.i.posthog.com` / `eu.i.posthog.com` — **not** `us.posthog.com`, which does not serve `/i/v0/e/`.

Conflating these two would be a real security bug (treating a public token as if it needed
protecting, or worse, putting the private key on the wire to a public-ingestion host), so this app
keeps them fully separate:

- **Auth** (`personal-api-key`) collects only the Personal API Key, `region` and `projectId` — it
  authenticates every action against the app/query REST API.
- **`capture-event`** takes its own `projectApiKey` and `region` params, declares
  `requiresAuth: false`, and needs **no stored Connection at all**. It is the only action in this
  app that works that way, and `tests/index.test.ts` asserts it stays that way.

## Auth — Personal API Key

PostHog → Settings → Personal API Keys → Create personal API key. Sent as
`Authorization: Bearer <key>` (`type: "bearer"`, the same pattern as this pack's GitHub app).

| Field | Type | Notes |
|---|---|---|
| `personalApiKey` | secret | The bearer credential. |
| `region` | select, default `us` | Which PostHog Cloud the project lives on. Self-hosted is not supported (a static egress allowlist can't address a customer-chosen host). |
| `projectId` | string | Numeric Project ID (Project Settings → General). Almost every app/query endpoint is scoped to a project, and one Personal API Key's account can span several. |

`region` and `projectId` are collected once, at connect time, and echoed onto the connection's
`display` by `afterConnect` — the same pattern Mailgun's region and Zendesk's subdomain use
elsewhere in this pack. Every action reads them from `ctx.connection.display` via `lib/client.ts`;
none of them ever touch the credential.

### Auth `test`

`GET /api/users/@me/` — confirmed directly in PostHog's own source
(`posthog/api/user.py`: `lookup_value == "@me"` is special-cased to mean "the authenticated user";
prose docs at `posthog.com/docs/api/user` say the same). This is the narrowest possible probe: it
needs only the `user:read` scope (present on effectively any key, since it is the user's own
identity) and no `projectId`, so it can validate the key before we even know whether it can reach
the project the user typed in.

## Actions

| Key | Type | Endpoint | Scope needed |
|---|---|---|---|
| `capture-event` | perform | `POST /i/v0/e/` (ingestion host) | none — public Project API Key |
| `person-list` | read | `GET /api/projects/{id}/persons/` | `person:read` |
| `person-get` | read | `GET /api/projects/{id}/persons/{id}/` | `person:read` |
| `cohort-list` | read | `GET /api/projects/{id}/cohorts/` | `cohort:read` |
| `feature-flag-list` | read | `GET /api/projects/{id}/feature_flags/` | `feature_flag:read` |
| `feature-flag-get` | read | `GET /api/projects/{id}/feature_flags/{id}/` | `feature_flag:read` |
| `insight-list` | read | `GET /api/projects/{id}/insights/` | `insight:read` |
| `annotation-create` | perform | `POST /api/projects/{id}/annotations/` | `annotation:write` |

All eight endpoints, their query/body parameters, and (for `annotation-create`) the exact `scope`
(`dashboard_item` / `dashboard` / `project` / `organization` — `recording` is documented as
deprecated/rejected and deliberately not offered) and `creation_type` (`USR` / `GIT`) enum values
were cross-checked against PostHog's own live OpenAPI schema —
`GET https://us.posthog.com/api/schema/`, which is public and unauthenticated — on 2026-08-01, not
guessed from prose docs alone.

Two n8n Node operations were deliberately **not** ported as-is: n8n's PostHog node only wraps the
ingestion API (`event`/`track`/`identity`/`alias`, all POSTing to `/batch` or `/capture`) and
predates the app/query REST API entirely — it has no persons/cohorts/flags/insights/annotations
support at all. This app's `capture-event` supersedes n8n's `event:create` with the current
documented endpoint (`/i/v0/e/`, not the legacy `/capture`); `identify`/`alias`/`track` (page,
screen) are intentionally not carried over as separate actions since they are all just events with
reserved names (`$identify`, `$create_alias`, `$pageview`) — `properties`/`distinct_id` on
`capture-event` already covers them, and adding four more actions to special-case those names would
duplicate rather than extend it.

## Health check

Three different questions get confused with each other: is the *vendor* up, is *this credential*
live, and do we have *quota* left.

### Is the vendor up?

**Declared unavailable.** PostHog's status page (`https://status.posthog.com`) redirects to
`https://www.posthogstatus.com` — a bespoke Next.js app, **not** an Atlassian Statuspage instance
(unlike Mailgun's `status.mailgun.com` elsewhere in this pack). Checked live 2026-08-01:

- No Atom/RSS feed (`/history.rss`, `/feed/*` all 404).
- No documented JSON API anywhere in PostHog's own docs.
- Probing the live site turns up an internal `GET /api/status` route that happens to return
  well-formed JSON (`overall_status`, `component_groups[].components[].status`) — but it is
  unversioned, unlinked from the page's own HTML, and appears nowhere in PostHog's documentation.
  That is the signature of an internal implementation detail of their frontend, not a published
  contract: depending on it here would be exactly the kind of invented integration this app is
  supposed to avoid, since it could rename or disappear without notice and without it being PostHog
  breaking a promise (they never made one).

So `health/service.ts` declares `unavailable`, honestly, per `rfcs/healthcheck.md`, with
`severity: "informational"` — a plain `unavailable` entry always reports `unknown`, which outranks
`ok` in a roll-up, so it must never carry a severity that would let it worsen a verdict.

### Is this credential live?

The Auth `test` hook — see above (`GET /api/users/@me/`).

### Do we have quota left?

**Not declared, at all — not even as `unavailable`.** PostHog's rate limits are documented by
*value* (e.g. "480/minute and 4800/hour" for CRUD endpoints, `posthog.com/docs/endpoints/rate-limits`)
but the docs describe no response headers that expose remaining headroom, and a source check of
PostHog's own throttling code (`posthog/rate_limit.py` in `PostHog/posthog`) confirms it: no
`X-RateLimit-*` (or similar) headers are set on a normal response. The only rate-limit signal that
exists is DRF's built-in `Retry-After` header on an actual `429` — which is not something a
side-effect-free health probe can observe without first getting throttled. Several other apps in
this pack (`reddit`, `s3`, `splunk`, …) take the same approach and simply omit the check rather than
forcing an `unavailable` entry for something no vendor publishes a way to ask about at all.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).

| Key | Kind | Scope | Credential | Severity | Probe |
|---|---|---|---|---|---|
| `service` | service | app | none | informational | `health/service.ts` — declared `unavailable`, no vendor status API exists |
| `auth:personal-api-key` | credential | connection | signed | fatal | derived from the `personal-api-key` auth method's `test` hook |

---

Researched and endpoint-verified 2026-08-01 against PostHog's official docs (`posthog.com/docs/api`,
`/capture`, `/persons`, `/cohorts`, `/feature-flags`, `/insights`, `/annotations`,
`/personal-api-keys`, `/endpoints/rate-limits`), PostHog's live OpenAPI schema
(`us.posthog.com/api/schema/`), PostHog's own source (`PostHog/posthog` — `posthog/api/user.py`,
`posthog/rate_limit.py`), and n8n's PostHog node/credentials for structural comparison. Status
surfaces and undocumented internal routes move without notice; re-verify before trusting anything
in this file that isn't in PostHog's own published docs or schema.
