import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Azure Storage up?
 *
 * ## Azure publishes RSS, not a status API
 *
 * There is no `summary.json` and no components endpoint. The machine-readable
 * surface is an **RSS feed** at `azurestatuscdn.azureedge.net`, whose items are
 * incident announcements written for people — a title, a description, a
 * publication date. There is no per-service health field to read and nothing
 * that says "Blob Storage is currently degraded".
 *
 * So this check is declared **unavailable** rather than pretending. Reading the
 * feed would mean matching English prose against a service name, and prose
 * matching is exactly how a check ends up confidently wrong: a historical
 * incident mentioning Storage would read as a current outage, and a live
 * incident phrased as "some customers may experience" would not match at all.
 *
 * ## And it would answer the wrong question anyway
 *
 * Azure Storage's health is **per region and per account**. An account in
 * `westeurope` is unaffected by an incident in `eastus`, and the feed is a
 * global announcement channel. A connection-scoped check reaching the account
 * itself — which is what `account` below does — answers the question this one
 * could not.
 *
 * The Azure Service Health *API* does report per-subscription health, but it is
 * part of Azure Resource Manager, needs an Entra ID credential and a
 * subscription id, and is a different product from the storage account key this
 * app holds. A workflow that needs it should reach it directly.
 */
const check: HealthCheckDefinition = {
  key: "service",
  kind: "service",
  scope: "app",
  credential: "none",
  title: "Azure Storage status",
  description:
    "Not checkable usefully. Azure publishes incident announcements as RSS PROSE with no " +
    "per-service health field, and Storage health is per REGION and per account anyway — the " +
    "`account` check answers that, and this could not.",
  covers: ["service"],
  severity: "informational",
  unavailable: {
    reason: "Azure's machine-readable status surface is an RSS feed of incident announcements " +
      "(azurestatuscdn.azureedge.net) whose items are English prose — a title, a description and " +
      "a date, with no per-service state to read. Deciding health from it would mean matching " +
      "prose against a service name, which reports a historical incident as a current outage and " +
      "misses a live one that is worded differently. It would also answer the wrong question: " +
      "Azure Storage health is per REGION and per storage account, while the feed is a global " +
      "announcement channel. The `account` check reaches this connection's own account, which is " +
      "the question that matters. Per-subscription health does exist in the Azure Service Health " +
      "API, but that is Azure Resource Manager, needs an Entra ID credential and a subscription " +
      "id, and is not reachable with a storage account key.",
  },
};

export default check;
