/**
 * Is Excel Online up? — declared absent, with the reasoning recorded.
 *
 * Every plausible probe was re-checked against Microsoft's own surfaces on
 * 2026-08-03, and none of them is a *documented, unauthenticated,
 * machine-readable* statement about the Excel / SharePoint Online service:
 *
 *   - **Graph's own service-health API** (`GET /admin/serviceAnnouncement/
 *     healthOverviews`) is the right answer semantically, but it requires the
 *     `ServiceHealth.Read.All` permission with tenant-admin consent and is
 *     scoped to the calling tenant's subscribed services. A check that most
 *     connections cannot run reports a working App as broken.
 *   - **`status.cloud.microsoft`** is a client-rendered page. Its backing JSON
 *     endpoints are undocumented (discoverable only by reading the page's script
 *     bundle) and carry no stability contract; `/api/v2/status.json` under it
 *     answers `401`.
 *   - **`status.office365.com/api/v2/status.json`** answers `301` to a
 *     cross-host redirect rather than a status document.
 *   - **`portal.office.com/servicestatus`** answers `302` into the
 *     authenticated admin centre.
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
 * `auth:oauth2` check from the Auth `test` hook, which probes `GET /me`.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Excel platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Microsoft publishes no documented, unauthenticated, machine-readable status surface for Excel Online or SharePoint Online. The Graph service-health API (`/admin/serviceAnnouncement/healthOverviews`) needs `ServiceHealth.Read.All` with tenant-admin consent; `status.cloud.microsoft` is a client-rendered page whose backing JSON is undocumented and whose `/api/v2/status.json` returns 401; `status.office365.com/api/v2/status.json` returns a 301 cross-host redirect; `portal.office.com/servicestatus` returns 302 into the authenticated admin centre; and the Service Health Dashboard's RSS feed has been retired. Outages surface to this App as 5xx responses from graph.microsoft.com.",
  },
};

export default service;
