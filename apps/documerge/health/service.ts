/**
 * Is the vendor up? — DocuMerge publishes no status page, and saying so is a positive fact.
 *
 * `status.documerge.ai` does not resolve (measured 2026-10-06), the API reference and
 * homepage link none, and `documerge.statuspage.io` answers the 127,718-byte HTML catch-all
 * shell for its summary feed — the unclaimed-Statuspage decoy, not a real feed. The live
 * signals are the `api` reachability check and the derived `auth:api-token` check.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always reports
 * `unknown`, which outranks `ok` in the roll-up, so at any other severity it would pin the
 * app's verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "DocuMerge platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "DocuMerge publishes no status page: status.documerge.ai does not resolve and " +
      "documerge.statuspage.io is the unclaimed-Statuspage decoy. The `api` reachability check " +
      "and the derived `auth:*` check are the automatable signals.",
  },
};

export default service;
