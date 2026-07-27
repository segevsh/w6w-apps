# w6w-apps

Official **w6w app pack** — first-party integrations shipped as a registry Pack.

> **Status:** Development · **License:** MIT · **Spec:** `PackManifest v1`

## Contents

`w6w-pack.json` at the repo root lists every app bundled here. Register the
whole pack in one call:

```ts
import { createRegistry } from "@w6w/registry";
await registry.registerPack("github:w6w-io/w6w-apps@main");
// → { pack, results, registered, failed }
```

Or install a single app by pointing at its subdirectory
(`github:w6w-io/w6w-apps@main#apps/slack`, `file:./apps/slack`, …).

Each app dir is a standalone w6w App: `package.json` (manifest under the `w6w`
field), `index.ts` (default export of `AppDefinition`), `actions/`, `auth/`,
`assets/icon.{svg,png}`, and its own `deno.json` / `tsconfig.json` / `tests/`.

| App | Categories | Auth | Actions |
|-----|------------|------|--------:|
| airtable | spreadsheets, databases, productivity | personal-access-token, oauth2, api-key | 10 |
| anthropic | ai | api-key | 14 |
| asana | productivity, project-management | access-token, oauth2 | 22 |
| bitbucket | developer-tools | basic, access-token | 12 |
| brevo | marketing, email | api-key | 15 |
| calendly | calendar, productivity | personal-access-token, oauth2 | 12 |
| clickup | project-management, productivity | api-token, oauth2 | 12 |
| contentful | cms | access-token | 10 |
| discord | communication | bot-token, oauth2 | 19 |
| dropbox | storage | access-token, oauth2 | 12 |
| eventbrite | commerce, calendar | personal-token, oauth2 | 10 |
| facebook-lead-ads | marketing, social-media | oauth2, page-token | 2 |
| github | version-control, developer-tools | access-token, oauth2 | 24 |
| gitlab | developer-tools, version-control | access-token, oauth2 | 16 |
| gmail | communication, email | oauth2, service-account | 25 |
| google-calendar | calendar, productivity | oauth2, service-account | 8 |
| google-docs | productivity, documents | oauth2, service-account | 20 |
| google-drive | storage, productivity | oauth2, service-account | 18 |
| google-sheets | spreadsheets, productivity | oauth2, service-account | 12 |
| hubspot | crm, marketing | private-app-token, oauth2, api-key | 42 |
| intercom | support, communication, crm | access-token, oauth2 | 14 |
| jira | project-management, developer-tools | api-token, oauth2 | 15 |
| klaviyo | marketing, email | api-key | 23 |
| linear | project-management, developer-tools | api-key, oauth2 | 11 |
| mailchimp | marketing, communication | api-key, oauth2 | 14 |
| mistral | ai | api-key | 4 |
| monday | project-management, productivity | api-token, oauth2 | 14 |
| notion | productivity, documents | internal-secret, oauth2 | 17 |
| openai | ai, developer-tools | api-key | 13 |
| pipedrive | crm | api-token, oauth2 | 14 |
| salesforce | crm | access-token, oauth2 | 12 |
| sendgrid | email, communication | send-grid-api | 10 |
| shopify | commerce | access-token | 18 |
| slack | communication | access-token, oauth2 | 47 |
| stripe | commerce, finance | api-key | 23 |
| telegram | communication | bot-token | 21 |
| todoist | productivity | api-token, oauth2 | 14 |
| trello | project-management, productivity | api-key | 27 |
| twilio | communication | api-key | 2 |
| typeform | forms, productivity | personal-access-token, oauth2 | 10 |
| webflow | cms | api-token, oauth2 | 14 |
| woocommerce | commerce | api-key | 13 |
| wordpress | cms | basic, oauth2 | 15 |
| zendesk | support, crm | api-token, oauth2 | 17 |
| zoom | video, communication | server-to-server, oauth2 | 14 |

45 apps, 711 actions.

Icons are the vendors' own marks — copied verbatim from n8n's `nodes-base` for
the apps ported from it, and fetched from each vendor's brand page for the
apps built from scratch. See individual `assets/icon.*` for the exact source.

## Health checks

Every app **declares** its health checks per [`rfcs/healthcheck.md`][health-rfc], so a host
runs what the publisher says to run instead of guessing at a probe. Each declares a
`service` check (is the vendor up?) and a `quota` check (is there headroom?) — as a real
probe where the vendor supports one, and as an explicit `unavailable` where it does not,
because "nothing exists to check" is a more useful answer than a gap. Five apps addressed
by a per-tenant host (Salesforce, Jira, Zendesk, Shopify, WordPress) add a `dependency`
check for the tenant's own site. Credential checks come free: the runtime derives an
`auth:<method>` check from each Auth `test` hook.

Status hosts stay off every app's main egress allowlist — a `service` check widens egress
for its own worker only, which is safe precisely because such a check is never signed.

Per-app detail, including why each probe was chosen over the obvious alternatives, is in
`apps/<app>/README.md`, indexed in [HEALTHCHECKS.md](HEALTHCHECKS.md).

[health-rfc]: https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md

## Layout

```
w6w-apps/
├── w6w-pack.json           # top-level pack manifest — the registry entry point
├── apps/                   # every App lives here
│   └── <app>/              # one dir per App
│       ├── README.md       # usage + health check (status, probe, quota)
│       ├── package.json    # manifest (w6w field)
│       ├── deno.json
│       ├── tsconfig.json
│       ├── index.ts
│       ├── assets/icon.{svg,png}
│       ├── auth/*.ts
│       ├── actions/*.ts
│       ├── health/*.ts      # declared health checks (service, quota, dependency)
│       ├── lib/*.ts
│       └── tests/
└── _tools/                 # scaffolding + porting helpers (not shipped)
```

## Contributing

Each app has a `deno.json` with local tasks:

```sh
cd apps/<app>
deno task test
deno task check
deno task lint
```

Before opening a PR, run the pack-wide conformance auditor from the repo root.
It validates every app against `core`'s own `@w6w/validator`, rebuilds each
manifest the way the runtime's loader does, and source-scans for the sandbox
rules that are only visible in code — global `fetch`, `Deno.*`, credentials
handled outside an auth `sign` hook, and hosts called but absent from
`w6w.network.allow`:

```sh
deno run --no-check -A _tools/audit.ts          # every app
deno run --no-check -A _tools/audit.ts slack    # one app
deno run --no-check -A _tools/audit.ts --json   # machine-readable
```

It exits non-zero on any error. Warnings flag optional-but-recommended
metadata (`output`, `idempotent`, a unit test per action).

Ship changes through a PR against `w6w-io/w6w-apps` from a personal fork —
never push directly to `main` here.

## Spec

- Pack manifest shape: `PackManifest` in `@w6w/types` (see `w6w-io/w6w-core`).
- Pack install mechanics: `registerPack()` in `@w6w/registry` (see
  `w6w-io/w6w-registry`).
