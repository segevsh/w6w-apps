/**
 * Quota headroom — declared absent. The docs state one limit: 2500 requests per
 * 5-minute window, shared by every API key in a workspace, answered with `429`
 * when exceeded. No rate-limit header, usage endpoint or `Retry-After` is
 * documented anywhere in the reference (checked 2026-10-06 across all 60
 * operation pages), so how much is left cannot be read.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description:
    "Not exposed: the limit is 2500 requests per 5 minutes per workspace, but no header or endpoint reports usage.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Superchat documents a workspace-wide 2500 requests / 5 minutes limit but no rate-limit header or usage endpoint.",
  },
};

export default quota;
