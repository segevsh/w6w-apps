# Facebook Lead Ads

Read Facebook Lead Ads forms and their recent leads via the Facebook Graph API.

- **Categories** — marketing, social-media
- **Auth methods** — oauth2, page-token
- **Actions** — 2
- **Egress allowlist** — `graph.facebook.com`

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — <https://metastatus.com>

Meta's status site covers the platform surfaces; there is no JSON API. The
developer-facing view lives at developers.facebook.com/status/dashboard.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The auth methods probe different endpoints:

| Auth method | Probe |
|---|---|
| `oauth2` | `GET /me` |
| `page-token` | `GET /me?fields=id,name` |

Resolves whoever the token belongs to — the user for the `oauth2` method, the Page
itself for `page-token`.

Both call `/me`; the Page-token method asks for fields explicitly because `/me` on a
Page token resolves to the Page rather than a user.

For diagnosing a token rather than just probing it, Graph's `GET
/debug_token?input_token=…` returns its type, scopes, expiry and owning app.

### Do we have quota left?

`X-App-Usage` and `X-Business-Use-Case-Usage` response headers carry percentage-of-quota
counters; Meta throttles when any reaches 100.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
