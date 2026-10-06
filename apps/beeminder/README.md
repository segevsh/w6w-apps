# Beeminder

Track goals, log datapoints, manage pledges and charge yourself with
[Beeminder](https://www.beeminder.com), the goal tracker with commitment contracts. 18 actions.

Verified 2026-10-06 against the vendor's API reference (https://api.beeminder.com/, the single-page
Slate document) and live unauthenticated probes of `www.beeminder.com`. The only `deprecat` wording
in the reference concerns individual attributes (`lane`, `headsum`, `hhmmformat`, ...) and the
`dial_road` endpoint, which is not covered here; v1 is the only version documented and is live.

## Auth

**Personal auth token**, added as the `auth_token` query parameter by the Auth `sign` hook (nothing in
an action sees it; it goes on POST/PUT/DELETE too, which the reference allows: "an additional GET or
POST parameter"). Log in to Beeminder and open `beeminder.com/api/v1/auth_token.json` to read it.
It is **not** the OAuth `access_token` — the reference calls mixing the two names the common mistake.
OAuth client auth (register an app, redirect flow) is not implemented.

The connect-time `test` calls `GET /users/me.json` (username, timezone, goal slugs; never the
token — `/auth_token.json` echoes it, so it is not used) and classifies from the body: 2xx without
an `errors` key passes, HTTP 401 is a rejected token.

Every action takes an optional `username`, default `me`. The reference documents the `me` macro for
OAuth access tokens; it could not be proved against a personal token without a live one, so if `me`
404s on your account, set `username` explicitly.

## Actions

| Group | Actions |
|---|---|
| User | `get-user` (with `diff_since`, `skinny`, `emaciated`, `datapoints_count`) |
| Goals | `get-goal`, `list-goals`, `list-archived-goals`, `create-goal`, `update-goal`, `refresh-graph` |
| Pledge | `ratchet-goal`, `stepdown-goal`, `cancel-stepdown`, `shortcircuit-goal`, `uncle-goal` |
| Datapoints | `list-datapoints`, `create-datapoint`, `create-datapoints`, `update-datapoint`, `delete-datapoint` |
| Charges | `create-charge` |

`shortcircuit-goal`, `uncle-goal` and `create-charge` **charge real money immediately and cannot be
undone**; `create-charge` and `create-goal` have a dry-run switch. `create-datapoint` sends a
`requestid` (default: the invocation id), which Beeminder treats as an upsert key, so a retried step
never double-counts. `list-datapoints` pages with `page` (1-indexed) + `per`, or takes `count` for the
latest n.

Writes are form-encoded like the reference's curl examples; `create-goal` / `update-goal` send JSON
because they carry arrays (`tags`, `roadall`) and explicit nulls. Neither encoding could be exercised
against a live token while building this app.

## Health checks

| Check | What it does |
|---|---|
| `service` | **Declared unavailable**, informational. `status.beeminder.com` 302s to `doc.beeminder.com/statusminder`, a real page titled "Beeminder Status Page" but a hand-maintained documentation page: no JSON, RSS or Atom feed. None is invented. |
| `api` | Unsigned `GET /users/me.json`. The schema-correct `401 {"errors":{"message":"Token missing or incorrect token.","token":"no_token"}}` is a **pass**; 5xx is `down`; any other body (including the unknown-path `404 {"error":...}`) is `unknown`. |
| `auth:auth-token` | Derived from the Auth `test` hook. |

No quota check: Beeminder documents no rate-limit or credit headers.

## Not covered (and why)

- **OAuth client flow, de-authorization and autofetch callbacks**: a different auth model; the
  personal token is what a workflow connection holds.
- **`dial_road`** (`POST .../dial_road.json`): documented as deprecated in favour of `roadall`, which
  `update-goal` takes.
- **Webhooks** (goal reminders POSTed to a URL): a trigger surface, not an action.
- **URL-based goal creation** (`beeminder.com/new?...`): a browser wizard requiring a logged-in
  session, not an API call.
- **The `/users/u.json?redirect_to_url=` authenticate-and-redirect form**: it only redirects a browser.
- **Group goals, `Charge a goal`**: the reference's "Charge a goal" section is only a pointer to Uncle.
