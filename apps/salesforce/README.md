# Salesforce

Create, read, update and query any Salesforce object with SOQL and SOSL.

- **Categories** — crm
- **Auth methods** — access-token, oauth2
- **Actions** — 12
- **Egress allowlist** — `*.salesforce.com`, `*.force.com`

## Health check

Three different questions get confused with each other, so this section keeps them
apart: is the *vendor* up, is *this credential* live, and do we have *quota* left. Only
the second is something the app itself performs.

### Is the vendor up?

**Service status** — machine-readable.

```
GET https://api.status.salesforce.com/v1/instances
```

Salesforce Trust exposes a real JSON API. `/v1/instances` lists every instance with its
`status`; `/v1/instances/{key}/status` narrows to one — and the instance key (`NA123`,
`EU45`) is the useful granularity, since an incident usually hits one instance rather
than the platform. Note that `status.salesforce.com/api/...` refuses direct access —
`api.status.salesforce.com` is the host to use.

### Is this credential live?

This is what the Auth `test` hook does — the app's own health check, and the only one of
the three it performs itself.

The auth methods probe different endpoints:

| Auth method | Probe |
|---|---|
| `access-token` | `GET /services/data/v60.0/limits` |
| `oauth2` | `GET /services/oauth2/userinfo` |

Dual-purpose: it validates the session **and** returns the org's quota, so one call
answers both 'is this credential live' and 'do we have headroom'. It needs no object
permission.

`/limits` needs an instance URL, which the token method collects up front. The OAuth
method does not have one until the token comes back, so it probes the identity endpoint
that the token response points at.

`GET /services/data/` on the instance host is unauthenticated and lists supported API
versions — a pure reachability check that needs no credential at all.

Nothing in this app calls that endpoint: it is out-of-band context for whoever is
diagnosing a failure, and the host it lives on is not in `w6w.network.allow`, so an
action could not reach it even if it tried.

### Do we have quota left?

The same `/limits` call. `DailyApiRequests` is the one a bulk workflow exhausts first,
and exhausting it locks the whole org out of the API for the rest of the day. Individual
responses also carry a `Sforce-Limit-Info` header.

---

Researched and endpoint-verified 2026-07-26. Status surfaces move; re-check with
`_tools/audit.ts` conventions in mind if a probe starts failing for everyone at once.
