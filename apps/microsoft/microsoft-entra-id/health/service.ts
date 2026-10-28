/**
 * Is Microsoft Entra ID up? — declared absent, with the reasoning recorded.
 *
 * Microsoft publishes no documented, unauthenticated, machine-readable status surface for Entra ID
 * or Microsoft Graph, so the sibling Microsoft Graph Apps (`teams`, `sharepoint`, `outlook`, …)
 * all declare this absent. It was re-checked for this App rather than copied:
 *
 *   - **Graph's service-health API** (`GET /admin/serviceAnnouncement/healthOverviews`) needs
 *     `ServiceHealth.Read.All` with tenant-admin consent and covers only the calling tenant's
 *     Microsoft 365 services, not the Graph front door.
 *   - **`status.cloud.microsoft`** is a client-rendered page: it answers `200 text/html` for any
 *     path, so a 200 there proves only that a SPA loaded.
 *   - **`azure.status.microsoft`** is a ~7 MB human-oriented HTML page, not a status document.
 *
 * The signal that *is* machine-checkable — "is the Graph API answering?" — lives in the sibling
 * `api` check. `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and a non-informational one would pin the roll-up verdict there permanently.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Microsoft Entra ID platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Microsoft publishes no documented, unauthenticated, machine-readable status surface for Microsoft Entra ID or Microsoft Graph. The Graph service-health API needs `ServiceHealth.Read.All` with tenant-admin consent and covers the tenant's Microsoft 365 services; `status.cloud.microsoft` is a client-rendered page that returns 200 text/html for any path; `azure.status.microsoft` is a human-oriented HTML page. The `api` check probes graph.microsoft.com directly instead.",
  },
};

export default service;
