import type { HealthCheckDefinition } from "@w6w/types";

/**
 * SOLAPI has a status page, `status.solapi.com`, but it is a client-rendered single-page app
 * (a 2.8 KB shell plus a ~1 MB bundle) with no published feed. Checked 2026-10-06: `/api/v2/summary.json`,
 * `/index.json`, `/history.atom`, `/feed.rss`, `/summary.json`, `/api/v2/status.json`,
 * `/api/status`, `/api/public/status` all answer a 19-byte JSON 404, and the bundle names no
 * public data endpoint. Nothing machine-readable exists to read, so this is a declared absence;
 * the `api` check probes the API host directly. `informational` keeps it from pinning the
 * app's verdict at `unknown`.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "SOLAPI platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "status.solapi.com is a client-rendered app with no feed or JSON endpoint " +
      "(every conventional path 404s; verified 2026-10-06). The `api` check probes the API " +
      "host directly.",
  },
};

export default service;
