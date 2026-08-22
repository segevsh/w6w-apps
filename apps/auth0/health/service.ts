/**
 * There is no status document this check can declare — and the reason is
 * interesting enough to write down.
 *
 * ## What Auth0 publishes
 *
 * `status.auth0.com` is not a Statuspage instance. It serves an HTML
 * application with no `components.json`, no `summary.json` and no
 * `status.json`; every one of those paths answers a 404 page (verified
 * 2026-08-18).
 *
 * What it *does* have, found by probing, is a **per-tenant RSS feed**:
 *
 *   GET https://status.auth0.com/api/rss?domain=acme.us.auth0.com
 *   → 200 application/rss+xml
 *     <title>Auth0 Status - acme.us.auth0.com</title>
 *
 * Called without the parameter it answers `Domain is required.`; called with a
 * malformed one it answers with the format spelled out — *"It should match
 * `tenant.us.auth0.com`, `tenant` being your supplied tenant, `us` being the
 * deployed region"*. Different regions return different documents, which is
 * exactly right: Auth0 runs many regional environments (US-1, US-3, EU-1, AU,
 * JP-1 …) and a tenant lives in one, so a global status would report outages a
 * given connection has no stake in.
 *
 * ## Why it is not wired up anyway
 *
 * A feed-backed check declares its source as a **static** `feed.url`, so the
 * host can fetch and parse the feed before the hook runs — which is what keeps
 * every app in this pack from reimplementing an RSS reader, subtly wrong, one
 * app at a time. Auth0's URL is not static: it carries the tenant domain, and
 * the domain is only known per Connection.
 *
 * The alternative would be for this app to fetch and parse RSS itself, which is
 * precisely the duplication the mechanism exists to prevent. So this check
 * states the absence and points at the one that does answer the question.
 *
 * ## What answers it instead
 *
 * The `tenant` check reads this connection's own tenant directly. That is a
 * better signal than an incident feed for the thing a workflow cares about —
 * "can I act on this tenant right now" — and it needs no interpretation of
 * whether a blog post is still open.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Auth0 platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Auth0 publishes no machine-readable status document. Verified 2026-08-18: " +
      "status.auth0.com serves an HTML application and answers a 404 page for " +
      "/api/v2/components.json, /api/v2/summary.json, /incidents.json and every RSS path tried. " +
      "Its one machine-readable source is a PER-TENANT feed — " +
      "GET status.auth0.com/api/rss?domain=<tenant>.<region>.auth0.com returns " +
      'application/rss+xml titled "Auth0 Status - <domain>", and answers "Domain is ' +
      'required." without the parameter — so its URL carries the tenant and cannot be a static ' +
      "`feed.url`. Wiring it up would mean this app parsing RSS itself, which is the " +
      "duplication the declared-feed mechanism exists to prevent. The `tenant` check answers " +
      "the operational question directly instead, and per tenant.",
  },
};

export default service;
