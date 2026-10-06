/**
 * Is Placid up? Declared unavailable.
 *
 * `status.placid.app` is real — title "placid.app Status", Statuspage-hosted logos — but it is a
 * client-rendered Next.js app (measured 2026-10-06): `/index.json`, `/summary.json`,
 * `/api/v2/summary.json`, `/api/v2/status.json`, `/feed.rss` and `/rss` all answer the same
 * 2,733-byte HTML "Application error" shell with a 404, `/history.atom` is a plain-text 404,
 * and `placid.statuspage.io` redirects to Atlassian's own marketing page (the unclaimed-page
 * decoy). With no feed or JSON to read, the permanent `unknown` is declared at informational
 * severity so it does not pin the App's verdict. The `api` check covers reachability.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Placid platform status",
  description:
    "status.placid.app is a real but client-rendered page with no JSON, RSS or Atom feed.",
  kind: "service",
  scope: "app",
  credential: "none",
  severity: "informational",
  unavailable: {
    reason: "status.placid.app is a client-rendered Next.js page; every machine path " +
      "(index.json, summary.json, api/v2/*.json, feed.rss, history.atom) answers a 404 HTML " +
      "shell or plain-text 404, and placid.statuspage.io redirects to Atlassian's marketing page.",
  },
};

export default service;
