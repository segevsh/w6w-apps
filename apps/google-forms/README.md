# Google Forms

Create and update Google Forms, manage publish state, and read form responses.

- **Categories** — forms, productivity
- **Auth methods** — oauth2, service-account
- **Actions** — 12
- **Egress allowlist** — `forms.googleapis.com`, `www.googleapis.com`
- **Website** — https://www.google.com/forms/about/
- **API docs** — https://developers.google.com/forms/api/reference/rest
- **Discovery document** — https://forms.googleapis.com/$discovery/rest?version=v1
- **GitHub** — https://github.com/googleworkspace/python-samples/tree/main/forms (Google
  Workspace's official Forms API samples; there is no vendor SDK repo dedicated to Forms —
  it ships inside the per-language Google API client libraries)

## Actions

Every path below is taken from the live discovery document (revision `20260729`), not from
memory. The Forms API is small — **five** methods on `forms` and `forms.responses`, plus four
on `forms.watches` — so most of the surface area is inside `:batchUpdate`.

| Key | Type | Endpoint |
|---|---|---|
| `form-create` | perform | `POST /v1/forms` |
| `form-get` | read | `GET /v1/forms/{formId}` |
| `list-forms` | search | `GET /drive/v3/files` (Drive — see below) |
| `form-batch-update` | perform | `POST /v1/forms/{formId}:batchUpdate` (raw `requests[]`) |
| `form-update-info` | perform | `:batchUpdate` → `updateFormInfo` |
| `form-update-settings` | perform | `:batchUpdate` → `updateSettings` |
| `form-add-item` | perform | `:batchUpdate` → `createItem` |
| `form-move-item` | perform | `:batchUpdate` → `moveItem` |
| `form-delete-item` | perform | `:batchUpdate` → `deleteItem` |
| `form-set-publish-settings` | perform | `POST /v1/forms/{formId}:setPublishSettings` |
| `response-list` | read | `GET /v1/forms/{formId}/responses` |
| `response-get` | read | `GET /v1/forms/{formId}/responses/{responseId}` |

Notes that are easy to get wrong, and are therefore encoded in the actions:

- **`forms.create` copies only two fields.** Google copies `info.title` and
  `info.documentTitle` onto the new form and silently drops anything else in the body — no
  description, no items. So `form-create` offers exactly those two, and everything else is a
  follow-up `:batchUpdate`. `documentTitle` is marked *output only* on the `Info` schema;
  creation is the one place it is writable.
- **Forms created via the API are unpublished by default** (for forms created after
  2026-06-30). `form-create` exposes the `unpublished` query flag, and
  `form-set-publish-settings` is its companion: `PublishState` carries `isPublished` and
  `isAcceptingResponses`, and unpublishing forces the latter to `false` server-side.
- **Items are addressed by index, not by ID.** `MoveItemRequest` and `DeleteItemRequest`
  carry a `Location`, whose only field is `index`. That is why `form-move-item` and
  `form-delete-item` are declared **not** idempotent: a repeat run acts on a different item,
  because the first run renumbered everything.
- **`updateMask` is required** on `updateFormInfo` and `updateSettings`, must name at least
  one field, and must *not* name the implied `info` / `settings` root. When left blank these
  actions derive it from the fields the caller actually filled in.
- **The `Item` union is taken as JSON.** `questionItem` / `questionGroupItem` /
  `pageBreakItem` / `textItem` / `imageItem` / `videoItem` nest choice options, grids,
  grading and media deeply enough that flattening them into form fields would either lose
  most of the API or become a second schema to maintain. `form-add-item` takes the `Item`
  verbatim.
- **There is no list method.** Every Forms API method requires a `formId`. Enumerating forms
  is Drive's job, so `list-forms` queries Drive v3 for
  `mimeType='application/vnd.google-apps.form'`. It is the one action that talks to
  `www.googleapis.com` rather than `forms.googleapis.com`.

Every `formId` param accepts either a raw ID or a pasted
`https://docs.google.com/forms/d/<id>/edit` URL. The published
`https://docs.google.com/forms/d/e/<id>/viewform` responder URL is deliberately **not**
unwrapped — that `e/` id is a different identifier and the API rejects it.

### Not implemented, and why

- **`forms.watches.*`** (`create` / `list` / `delete` / `renew`) exist and were verified, but
  a watch only delivers to a **Cloud Pub/Sub topic** you own (`projects/<p>/topics/<t>`), and
  expires after seven days. Nothing in this app can receive that delivery, so the four
  actions would produce a subscription with no consumer. Left out rather than shipped as a
  half-feature; if you already run a Pub/Sub → HTTP bridge, `form-batch-update`'s sibling
  methods are a small addition to make.
- **Responder management** is Drive's `permissions.create` / `permissions.delete` with
  `view: "published"`, not a Forms method. That belongs in the `google-drive` app.
- **Quiz answer keys / grading** are not separate endpoints — they are fields inside the
  `Item` JSON that `form-add-item` and `form-batch-update` already pass through.

## Auth

Two methods, mirroring the other Google apps in this pack.

**`oauth2`** — the "sign in with Google" flow. Requires a Google Cloud OAuth 2.0 client
configured on the w6w installation with the Forms API and Drive API enabled. Scopes, each
checked against the per-method `scopes` list in the discovery document:

| Scope | Needed for |
|---|---|
| `https://www.googleapis.com/auth/forms.body` | `forms.create`, `forms.batchUpdate`, `forms.setPublishSettings`; sufficient for `forms.get` |
| `https://www.googleapis.com/auth/forms.responses.readonly` | `forms.responses.list` / `.get` — the strongest scope the API offers for responses, because there is no response write method |
| `https://www.googleapis.com/auth/drive.file` | per-file Drive access to forms this app created or the user opened with it |
| `https://www.googleapis.com/auth/drive.metadata.readonly` | `list-forms`. Under `drive.file` alone Drive returns only files this app created, so "list my forms" would answer "nothing" for pre-existing forms |

`drive.metadata.readonly` is a **restricted** scope in Google's verification programme. If
you would rather not go through review, drop it from `auth/oauth2.ts` and drop `list-forms`
with it — every other action works on `forms.body` + `forms.responses.readonly` +
`drive.file`.

`access_type=offline` + `prompt=consent` are forced on the authorize URL, or Google silently
omits `refresh_token` for returning users. PKCE is off: this is a server-side app and the
client secret is the trust anchor.

**`service-account`** — JWT-bearer, for server-to-server runs. Paste a service account's
`client_email` and PEM `private_key`; each request signs an RS256 assertion and exchanges it
at `oauth2.googleapis.com/token`. Forms-specific caveats:

- A form the service account **creates** is owned by the service account, which has no Drive
  UI — nobody can open it. Create as a user, or hand ownership over afterwards.
- A form it **reads or edits** must be shared with the service account's email, exactly like
  sharing with a person.
- Domain-wide delegation (the optional `subject` field) is usually what you actually want, so
  the account acts as a real user and forms land in a real Drive.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — machine-readable, the Google Workspace Status Dashboard.

```
GET https://www.google.com/appsstatus/dashboard/incidents.json
```

The dashboard publishes an incident *feed*, not a current-state rollup, so "up" is the
absence of an open incident — an entry with no `end` is still running. The feed covers all of
Workspace, so it is filtered to `service_name == "Google Forms"`; a Meet outage is not a
Forms outage. "Google Forms" was confirmed to be a real product on the dashboard (it appears
in `products.json`), so that filter matches something rather than silently matching nothing.

`status_impact` maps `SERVICE_OUTAGE → down`, `SERVICE_DISRUPTION → degraded`,
`SERVICE_INFORMATION → ok`. A dashboard that itself fails reports `unknown`, never `down` —
a broken status page tells us nothing about Google.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

| Auth method | Probe |
|---|---|
| `oauth2` | `GET https://oauth2.googleapis.com/tokeninfo` |
| `service-account` | `POST https://oauth2.googleapis.com/token` (JWT grant) |

The Forms API is per-form: all five methods require a `formId`, and there is no whoami, ping,
or list endpoint that a credential can reach without already knowing a form. So there is
nothing cheap to probe on the API itself, and the check validates the *token* instead —
the same choice, for the same reason, as the Sheets and Docs apps in this pack. The
service-account method proves its credential by exchanging its signed JWT for an access
token; there is no user token to introspect.

### Do we have quota left?

Declared absent. Google publishes the ceilings — **975** read / **450** expensive read
(`forms.responses.list`) / **375** write requests per minute per project, and **390** / **180**
/ **150** per user per project — but exposes no counter for consumption and returns no
`RateLimit-*` headers. The only signal is a `429` after the fact, and consumption is visible
only in the Google Cloud console. Stated as a positive fact rather than left as a gap.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 120s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |
| `auth:service-account` | credential | connection | signed | fatal | — | derived from the `service-account` auth method's `test` hook |

The host `www.google.com` (for `service`) is reachable **only inside that hook's worker** —
not from any action, and not from the other checks. The spec allows the widening precisely
because the check is unsigned; pairing an extra host with `credential: "signed"` is rejected
at load time, so a credential can never reach a status host.

**`quota` is declared absent.** A declared absence always reports `unknown`, so it carries
`severity: "informational"` — otherwise it would pin every verdict for this app at `unknown`
forever.

## Icon

`assets/icon.svg` is drawn for this pack, on the same Google Workspace document silhouette as
the sibling `google-sheets` / `google-docs` icons, in Google Forms' brand purple with a
checklist glyph. It is not a copy of a vendor asset — n8n has no Google Forms node, so unlike
most icons here there was no upstream mark to port.

---

Researched and endpoint-verified 2026-08-03 against the live discovery document
(`https://forms.googleapis.com/$discovery/rest?version=v1`, revision `20260729`) and the
reference pages under `developers.google.com/forms/api`. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
