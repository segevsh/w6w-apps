# WordPress

Create, read, update and delete posts, pages and users on a WordPress site.

- **Categories** — cms
- **Auth methods** — basic, oauth2
- **Actions** — 15
- **Egress allowlist** — `*`

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — none published.

There is no vendor status service: a self-hosted WordPress site **is** the dependency,
so the site's own reachability is the only thing worth checking. (WordPress.com-hosted
sites are covered by status.automattic.com, which is a human page.)

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

All 2 auth methods probe:

```
GET /wp-json/wp/v2/users/me
```

The authenticated user. Note that WordPress hides `/users/me` from unauthenticated
callers, so a 401 here is a genuine credential failure rather than a missing route.

`GET /wp-json/` is unauthenticated and returns the REST API discovery document — the
right probe for 'is this site up and is the REST API enabled at all', which is a
distinct failure from a bad credential. Plugins that disable the REST API fail here
rather than at the credential.

### Do we have quota left?

None — a self-hosted site imposes whatever its own host does.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
