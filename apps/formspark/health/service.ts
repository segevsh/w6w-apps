/**
 * Is the vendor up? — Formspark publishes no machine-readable status, and saying so is a fact.
 *
 * `status.formspark.io` is a custom 7 KB HTML page with no Statuspage / Instatus / Better Stack
 * marker, and `/index.json` answers HTML (measured 2026-10-06), so there is no feed to declare
 * and no component schema to read. Nothing is invented here: the live signals are the `api`
 * reachability check and the derived `auth:api-token` credential check.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always reports
 * `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other severity this would
 * pin the app's verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Formspark platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Formspark's status page (status.formspark.io) is custom HTML with no feed or JSON " +
      "API behind it. The `api` reachability check and the derived `auth:*` check are the " +
      "automatable signals.",
  },
};

export default service;
