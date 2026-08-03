/**
 * Is Microsoft To Do up? — declared absent, with the reasoning recorded.
 *
 * The sibling `outlook`, `teams` and `excel` Apps each reached this conclusion
 * for their own Microsoft 365 workload. It was **re-probed for To Do on
 * 2026-08-03 rather than inherited**, because a consumer-facing product could
 * plausibly have a status surface that the enterprise workloads do not. It does
 * not. What the probes actually returned:
 *
 *   - **`status.cloud.microsoft`** — a client-rendered SPA, and a *catch-all*.
 *     `GET /`, `GET /api/status` and `GET /definitely-not-a-real-path-zzz9` all
 *     answer `200 text/html` with the **same 2058-byte** document. A path that
 *     returns identical bytes to a deliberately bogus sibling path is not an
 *     endpoint. Its backing JSON is real but undocumented (discoverable only by
 *     reading the page's script bundle) and carries no stability contract.
 *   - **`status.office365.com`** — 301s onto `status.cloud.microsoft`, and
 *     `/api/v2/status.json` under it answers `401` with an empty body.
 *   - **`microsofttodo.statuspage.io`** — the classic trap, and it is live here:
 *     `/api/v2/status.json` answers `200 text/html` after redirecting to
 *     `https://www.atlassian.com/software/statuspage`, a 127,720-byte marketing
 *     page. The subdomain is unclaimed. `microsoft.statuspage.io` is claimed but
 *     inactive (`401`, "Your page is inactive"). Neither is a status API.
 *   - **`todo.microsoft.com`** — the product's own host answers `404` to `GET /`
 *     (it is a redirector to `to-do.office.com`), so there is no status document
 *     there either.
 *   - **Graph's own service-health API** (`GET /admin/serviceAnnouncement/
 *     healthOverviews`) is the right answer semantically, but it requires
 *     `ServiceHealth.Read.All` with tenant-admin consent, is scoped to the
 *     calling tenant's subscribed services, and is unsupported for personal
 *     Microsoft accounts. This App is explicitly built for personal accounts as
 *     well as work ones, so that probe would report `unknown` for a large share
 *     of its Connections and demand an admin-consented scope from the rest.
 *   - The Service Health Dashboard's **RSS feed was retired**; the current
 *     guidance points humans at the status site and `@MSFT365Status`, neither of
 *     which is a machine surface.
 *
 * So this is declared absent rather than backed by a guess. `severity:
 * "informational"` because an `unavailable` entry always reports `unknown`, and
 * a non-informational check would pin this App's roll-up verdict there
 * permanently.
 *
 * Credential liveness is covered regardless: the runtime derives an
 * `auth:oauth2` check from the Auth `test` hook, which probes
 * `GET /me/todo/lists`.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Microsoft To Do platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Microsoft publishes no documented, unauthenticated, machine-readable status surface for Microsoft To Do. `status.cloud.microsoft` is a client-rendered catch-all — `/`, `/api/status` and a deliberately bogus path all return the same 2058-byte HTML document — and its backing JSON is undocumented; `status.office365.com` 301s there and its `/api/v2/status.json` returns 401; `microsofttodo.statuspage.io` is an unclaimed Statuspage subdomain that redirects to Atlassian's marketing page; `todo.microsoft.com` returns 404 at the root; the Service Health Dashboard's RSS feed has been retired; and the Graph service-health API needs `ServiceHealth.Read.All` with tenant-admin consent and is unsupported for the personal Microsoft accounts this App also serves. Outages surface to this App as 5xx responses from graph.microsoft.com.",
  },
};

export default service;
