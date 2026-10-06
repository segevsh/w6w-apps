/**
 * Is the vendor up? — Inoreader's status page exists but offers nothing a host can read.
 *
 * `status.inoreader.com` is real (a custom Rails page titled "Inoreader status", with a
 * component named `API`, measured 2026-10-06) but it publishes no feed or JSON document:
 *
 *   - `/history` is the human incident history (HTML);
 *   - `/history.atom`, `/history.rss` -> `500`; `/feed`, `/rss`, `/summary.json`,
 *     `/index.json`, `/status.json`, `/components.json`, `/status` -> the page's own 404 HTML;
 *   - every `/api/...` path, Statuspage-shaped or not (`/api/v2/summary.json`,
 *     `/api/v2/components.json`, `/api/v1/status`, `/api/incidents`, …), answers the
 *     IDENTICAL `400 {"status":"invalid-controller-or-action"}` — a catch-all, not an API.
 *
 * Nothing to declare and nothing to parse, so nothing is invented. The live signals are the
 * `api` reachability check and the derived `auth:oauth2` credential check.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always reports `unknown`,
 * and `unknown` outranks `ok` in the roll-up.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Inoreader platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "status.inoreader.com is an HTML-only page (it has an `API` component) with no " +
      "feed or JSON: /history.atom and /history.rss answer 500, the JSON paths 404, and every " +
      "/api/* path answers the same 400 catch-all. The `api` reachability check and the " +
      "derived `auth:*` check are the automatable signals.",
  },
};

export default service;
