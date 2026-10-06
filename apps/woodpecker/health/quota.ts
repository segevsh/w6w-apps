import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Declares that no quota signal exists: a positive fact, not an omission.
 *
 * Woodpecker's rate-limiting page (read 2026-10-06) says the API has "unlimited monthly
 * calls", processes one request at a time and queues up to 6 more for 15 seconds each,
 * dropping the rest with a `429`, counted per account. That is a concurrency rule, not
 * a remaining-requests counter: no endpoint or response header reports headroom, so
 * there is nothing a check could read.
 *
 * `severity: "informational"`: `unknown` outranks `ok` in a roll-up, so the `degraded`
 * default for `kind: "quota"` would pin the App there forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  kind: "quota",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason: "Woodpecker documents unlimited monthly calls and a concurrency limit (one request " +
      "at a time, six queued, then 429) with no remaining-requests header or usage endpoint.",
  },
};

export default quota;
