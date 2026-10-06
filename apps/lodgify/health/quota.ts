/**
 * Quota headroom — Lodgify publishes none.
 *
 * docs.lodgify.com/docs/rate-limits documents fixed ceilings (v1: 600 requests/minute,
 * v2: 750 requests/minute, `*.ics`: 10/minute) and a 429 with a message when exceeded.
 * It documents no rate-limit response header, no usage endpoint, and none was observed
 * on live responses (2026-10-05), so there is nothing to read remaining headroom from.
 * Declared as an informational absence so it does not pin the verdict at `unknown`.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Lodgify request headroom",
  description: "Lodgify documents fixed per-minute ceilings but no header or endpoint that " +
    "reports remaining headroom.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Lodgify documents 600 requests/minute on v1 and 750 on v2 (docs.lodgify.com/docs/" +
      "rate-limits) with a 429 when exceeded, but publishes no rate-limit header or usage " +
      "endpoint, and none was seen on live responses (2026-10-05).",
  },
};

export default quota;
