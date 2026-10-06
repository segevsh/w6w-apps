/**
 * Is the vendor up? — Everhour's status page exists but offers nothing a host can read.
 *
 * `status.everhour.com` is real: a Hund.io page titled "Status Page - Everhour" with components
 * `API`, `Sync` and `Browser Extension` (measured 2026-10-06). But it is client-rendered HTML
 * with no public machine-readable output. Index-path rule, tried 2026-10-06:
 *
 *   - `/summary.json`, `/status.json`, `/index.json`, `/api/v2/summary.json`, `/api/v2/status.json`
 *     -> 404 (the page's own not-found HTML);
 *   - `/history.rss`, `/history.atom`, `/history.json` -> `406 Not Acceptable` for every `Accept`
 *     value tried (`application/rss+xml`, `application/atom+xml`, `application/xml`, a wildcard);
 *   - `/api/v1/components.json` -> `401 not_authenticated` (Hund's API is keyed to the owner);
 *   - `everhour.statuspage.io` -> 302 to `/inactive` (an unclaimed Statuspage, not theirs).
 *
 * No feed to declare and no JSON to parse, so nothing is invented. The live signals are the
 * `api` reachability check and the derived `auth:api-key` credential check.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`,
 * and `unknown` outranks `ok` in the roll-up, so at any other severity this would pin the app's
 * verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Everhour platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "status.everhour.com is a Hund.io HTML page (components API, Sync, Browser " +
      "Extension) with no feed or JSON a host can read: /history.* answer 406 and the JSON " +
      "paths 404. The `api` reachability check and the derived `auth:*` check are the " +
      "automatable signals.",
  },
};

export default service;
