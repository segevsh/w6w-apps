# Google Meet

Create and manage Google Meet spaces, and read conference records, participants,
recordings and transcripts.

- **Categories** — video, communication
- **Auth methods** — oauth2, service-account
- **Actions** — 18
- **Egress allowlist** — `meet.googleapis.com` (the API host); `www.googleapis.com` is
  also listed because the OAuth **scope URIs** live on it (the audit reads them out of
  `auth/`, and every sibling Google app carries it). No action calls it.
- **Website** — https://meet.google.com
- **API docs** — https://developers.google.com/meet/api/guides/overview

The app is built against the Google Meet REST API **v2** discovery document
(`https://meet.googleapis.com/$discovery/rest?version=v2`), which is the source of
truth for every path, parameter and field. `rootUrl` is `https://meet.googleapis.com/`
with an empty `servicePath`, so every request is `rootUrl + path` — i.e.
`https://meet.googleapis.com/v2/…`.

## What it does

The API is organized around two things:

- a **space** — a durable meeting room with a stable join link (`meetingCode` /
  `meetingUri`) and a `config` (`SpaceConfig`). This app can create a space, read
  it, patch its settings, and end a conference that is live in it.
- a **conference record** — one instance of a call held in a space. Everything
  Meet captures hangs off it: the **participants**, each participant's join/leave
  **sessions**, the **recordings**, and the **transcripts** with their individual
  **entries**.

Co-hosts of a space are also exposed (as `spaces.members`), which is
configuration, not the live participant roster.

## Deliberately out of scope

Two resource groups from the discovery document are **not** implemented:

- **`spaces.members` writes** — `create`, `patch`, `delete` and `batchUpdate`.
  Only `list` and `get` ship here; changing a space's co-host roster is a
  follow-up rather than something to guess at now.
- **`conferenceRecords.smartNotes`** (`list` / `get`) — the newer AI-generated
  meeting-notes resource. Its scope and Workspace-edition availability are not
  clearly pinned down, so it is left out rather than shipped on an assumption.

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left.
Only the second is something the app itself performs.

### Is the vendor up?

**Service status** — machine-readable.

```
GET https://www.google.com/appsstatus/dashboard/incidents.json
```

Google publishes an incident *feed* rather than a current-state rollup, so "up" is
the absence of an open incident (an entry with no `end`). The feed covers all of
Workspace, so it is filtered to the `service_name` **`Google Meet`** — a Calendar
or Gmail outage is not a Meet outage.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only
one of the three it performs itself.

Both auth methods probe:

```
GET /v2/conferenceRecords?pageSize=1
```

The cheapest read that proves the token actually carries a Meet scope. It succeeds
even for an account with no meeting history — an empty list is still a 200 — and it
never echoes the credential back in the response body. A `spaces.get` probe would
need a concrete space name or meeting code the auth hook does not have.

### Do we have quota left?

No headroom endpoint and no rate-limit headers; quota is per-project, metered in
the Google Cloud console, and exhaustion surfaces as 429/403.

## Declared health checks

Per [`rfcs/healthcheck.md`](https://github.com/w6w-io/w6w-core/blob/main/rfcs/healthcheck.md).
The three questions above map onto declared checks like this:

| Key | Kind | Scope | Credential | Severity | Min interval | Probe |
|---|---|---|---|---|---|---|
| `service` | service | app | none | degraded | 120s | `health/service.ts` |
| `quota` | quota | connection | signed | informational | — | _declared absent_ |
| `auth:oauth2` | credential | connection | signed | fatal | — | derived from the `oauth2` auth method's `test` hook |
| `auth:service-account` | credential | connection | signed | fatal | — | derived from the `service-account` auth method's `test` hook |

The host `www.google.com` (for `service`) is reachable **only inside that hook's
worker** — not from any action, and not from the other checks. The spec allows the
widening precisely because the check is unsigned; pairing an extra host with
`credential: "signed"` is rejected at load time, so a credential can never reach a
status host.

**`quota` is declared absent.** Google publishes no Meet-specific headroom endpoint
or rate-limit headers. A declared absence always reports `unknown`, so it carries
`severity: "informational"` — otherwise it would pin every verdict for this app at
`unknown` forever.

## Icon

The mark is the Simple Icons **Google Meet** icon, saved verbatim to
`assets/icon.svg`. The single-colour export is re-inked to white in
`assets/icon.dark.svg` (declared as `appearance.darkMode.icon`) so it stays legible
on the dark tile, per `_tools/icon-legibility.ts`.

---

Researched and endpoint-verified against discovery revision `20260917`. Status
surfaces move; re-check with `_tools/audit.ts` conventions in mind if a probe starts
failing for everyone at once.
