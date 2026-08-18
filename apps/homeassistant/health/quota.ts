import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Home Assistant has no request quota, because it is your own server.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request headroom",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason:
      "Home Assistant is software you run, and it imposes no API rate limit — there is no quota " +
      "to report. Verified 2026-08-18 against the REST API documentation: no endpoint reports " +
      "usage, and no response carries rate-limit headers. What constrains an instance is its own " +
      "hardware, and that shows up as latency rather than as refusal — a Raspberry Pi asked for " +
      "GET /api/states every second will simply get slower, and the recorder's SQLite database " +
      "is usually what gives first. The one real limit worth knowing is not a quota either: " +
      "GET /api/history/period without filter_entity_id can occupy the recorder for minutes, " +
      "which is why `history-get` requires entity ids. If the instance is reached through Nabu " +
      "Casa Cloud Remote UI then that service's own limits apply, but they belong to the " +
      "subscription rather than to the API and are not reported in-band.",
  },
};

export default quota;
