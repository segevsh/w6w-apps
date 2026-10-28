/**
 * Is Outlook up? — declared absent, with the reasoning recorded.
 *
 * Every plausible probe was checked against Microsoft's own surfaces, and none
 * of them is a *documented, unauthenticated, machine-readable* statement about
 * Exchange Online:
 *
 *   - **Graph's own service-health API** (`GET /admin/serviceAnnouncement/
 *     healthOverviews`) is the right answer semantically, but it requires the
 *     `ServiceHealth.Read.All` permission with tenant-admin consent, is scoped
 *     to the calling tenant's subscribed services, and is unsupported for
 *     personal Microsoft accounts. A check that most connections cannot run
 *     reports a working App as broken.
 *   - **`status.cloud.microsoft`** is a client-rendered page; every path under
 *     it answers `200 text/html`, so fetching it proves nothing. Its backing
 *     JSON endpoints are real and unauthenticated, but they are undocumented
 *     (discoverable only by reading the page's script bundle), carry no
 *     stability contract, and the one covering mail covers **Outlook.com
 *     consumer** rather than Exchange Online.
 *   - **`status.office365.com`** and **`outlook.office.com/api/v1.0/status`**
 *     answer `401`.
 *   - The Service Health Dashboard's **RSS feed was retired**; the current
 *     guidance points humans at the status site and `@MSFT365Status`, neither of
 *     which is a machine surface.
 *
 * So this is declared absent rather than backed by a guess. `severity:
 * "informational"` because an `unavailable` entry always reports `unknown`, and
 * a non-informational check would pin this App's roll-up verdict at `unknown`
 * permanently.
 *
 * Credential liveness is covered regardless: the runtime derives an
 * `auth:oauth2` check from the Auth `test` hook, which probes `GET /me`.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Outlook platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Microsoft publishes no documented, unauthenticated, machine-readable status surface for Exchange Online. The Graph service-health API (`/admin/serviceAnnouncement/healthOverviews`) needs `ServiceHealth.Read.All` with tenant-admin consent and is unsupported for personal accounts; `status.cloud.microsoft` is a client-rendered page whose backing JSON is undocumented and covers consumer Outlook.com rather than Exchange Online; `status.office365.com` returns 401; and the Service Health Dashboard's RSS feed has been retired. Outages surface to this App as 5xx responses from graph.microsoft.com.",
  },
};

export default service;
