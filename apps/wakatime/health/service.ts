import type { HealthCheckDefinition } from "@w6w/types";

/**
 * WakaTime's status page is real but offers nothing a machine can read (checked 2026-10-06).
 * `status.wakatime.com` answers 200 `<title>Status - WakaTime</title>` (an "All systems
 * operational" HTML page, linked from wakatime.com's footer), but `/api/v2/summary.json`,
 * `/index.json`, `/history.atom` and `/feed.json` are all 404 HTML. Declared absent; `api`
 * (reachability) and the derived `auth:*` check are the automatable signals.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "WakaTime platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "status.wakatime.com is an HTML-only page with no JSON, RSS or Atom feed " +
      "(every machine path answers 404 HTML). The `api` reachability check and the derived " +
      "`auth:*` check are the automatable signals.",
  },
};

export default service;
