# Box

Upload, download, and manage files and folders in Box.

- **Categories** — storage
- **Auth methods** — oauth2
- **Actions** — 10
- **Egress allowlist** — `api.box.com`, `upload.box.com`

## A note on the download redirect

`GET /files/{id}/content` (used by `download-file`) answers with a `302` to a
`dl*.boxcloud.com` host that varies per request — Box's own docs give
`dl.boxcloud.com` as the example and community reports show `dl2`/`dl3` in the
wild. That redirect is followed transparently by the single `fetch()` call the
host performs on this app's behalf; the runtime's egress allowlist only
inspects the request's own hostname (see `lib/client.ts`), so `*.boxcloud.com`
is neither declared in `w6w.network.allow` nor needed there.

## Uploads are text-only

`upload-file` hand-builds its `multipart/form-data` body as a UTF-8 string
(`attributes` part first, then `file`, exactly as Box's docs require — the
other order gets a `400 metadata_after_file_contents`). This app's sandbox
coerces every `ctx.fetch` body to a string en route to the network, so a real
`FormData` or binary payload would not survive intact; restricting content to
text keeps the body a string end to end. Same constraint and same choice as
this pack's Dropbox app.

## Health check

Three different questions get confused with each other, so this section keeps
them apart: is the *vendor* up, is *this credential* live, and do we have
*quota* left. Only the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://status.box.com>

```
GET https://status.box.com/api/v2/summary.json
```

Atlassian Statuspage — the same shape as `status.dropbox.com`. `status.indicator`
is `none` / `minor` / `major` / `critical`; `components` carries per-component
detail. Unauthenticated, CORS-enabled, cheap to poll.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the
only one of the three it performs itself.

```
GET /2.0/users/me
```

Identifies the account (`id`, `name`, `login`), which also supplies the
connection label. Needs no particular scope beyond basic account access.

### Do we have quota left?

No headroom endpoint or response headers. Box answers `429` with `Retry-After`
and nothing else — no `X-RateLimit-Remaining`-style counter. (`/users/me` does
report *storage* quota via `space_amount`/`space_used`, but that's a different
question — "how much room is in the account" — from API throttling headroom,
so it isn't repurposed here.)

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 60s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |

The host `status.box.com` (for `service`) is reachable **only inside that
hook's worker** — not from any action, and not from the other checks. The spec
allows the widening precisely because the check is unsigned; pairing an extra
host with `credential: "signed"` is rejected at load time, so a credential can
never reach a status host.

**`quota` is declared absent.** Box publishes no rate-limit headroom endpoint
or response headers. A declared absence always reports `unknown`, so it
carries `severity: "informational"` — otherwise it would pin every verdict for
this app at `unknown` forever.

## OAuth notes

- Box's `/api/oauth2/authorize` does **not** accept a `scope` query parameter.
  Scopes are fixed once, on the app itself, in the Developer Console's
  "Application Scopes" section. `root_readwrite` (declared in
  `auth/oauth2.ts` for documentation) covers every action this app ships.
- PKCE is left off (`pkce: false`): Box's own without-SDK OAuth guide
  documents only the classic `client_secret` exchange and says nothing about
  `code_challenge`/`code_verifier`, so this app does not opt into it on
  spec.
- Refresh tokens rotate on every use (~60-day validity, one-time-use). No
  custom `refresh` hook is declared — the standard `grant_type=refresh_token`
  POST to `tokenUrl` is handled generically by the host, which must persist
  the rotated refresh token it gets back.

---

Researched and endpoint-verified 2026-08-01 against developer.box.com and
status.box.com. Status surfaces move; re-check if a probe starts failing for
everyone at once.
