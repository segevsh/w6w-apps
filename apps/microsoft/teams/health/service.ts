/**
 * Is Microsoft Teams up? — declared absent, with the reasoning recorded.
 *
 * The sibling `outlook` App reached this conclusion for Exchange Online in
 * August 2026. It was **re-verified for Teams rather than assumed**, because a
 * different Microsoft 365 workload could plausibly have a different status
 * surface. It does not. Every plausible probe was checked again, and none of
 * them is a *documented, unauthenticated, machine-readable* statement about the
 * Microsoft Teams service:
 *
 *   - **Graph's own service-health API** (`GET /admin/serviceAnnouncement/
 *     healthOverviews`) is the right answer semantically, and Teams appears in
 *     it as the `microsoftteams` service. But it requires the
 *     `ServiceHealth.Read.All` permission with tenant-admin consent and is
 *     scoped to the calling tenant's subscribed services. This App already
 *     carries two admin-consented scopes; making the *health check itself*
 *     depend on a third would mean a correctly working App reports as broken in
 *     every tenant that consented to the messaging scopes and no more.
 *   - **`status.cloud.microsoft`** is a client-rendered page; every path under
 *     it answers `200 text/html`, so fetching it proves nothing. Its backing
 *     JSON endpoints are real and unauthenticated, but they are undocumented
 *     (discoverable only by reading the page's script bundle) and carry no
 *     stability contract.
 *   - **`status.office365.com`** answers `401`.
 *   - The Service Health Dashboard's **RSS feed was retired**; the current
 *     guidance points humans at the status site and at `@MSFT365Status`, neither
 *     of which is a machine surface.
 *   - Teams has **no product-specific status host** of its own — no
 *     `status.teams.microsoft.com` — so there is nothing here that the Outlook
 *     investigation did not already cover.
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
  title: "Microsoft Teams platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Microsoft publishes no documented, unauthenticated, machine-readable status surface for Microsoft Teams. The Graph service-health API (`/admin/serviceAnnouncement/healthOverviews`) needs `ServiceHealth.Read.All` with tenant-admin consent and is scoped to the calling tenant; `status.cloud.microsoft` is a client-rendered page whose backing JSON is undocumented; `status.office365.com` returns 401; the Service Health Dashboard's RSS feed has been retired; and Teams has no status host of its own. Outages surface to this App as 5xx responses from graph.microsoft.com.",
  },
};

export default service;
