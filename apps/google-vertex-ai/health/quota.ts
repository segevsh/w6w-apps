/**
 * Quota headroom — declared unavailable.
 *
 * The discovery document (fetched 2026-10-05) declares no rate-limit or quota
 * response headers and no headroom endpoint. Vertex AI's limits — per-model
 * requests and tokens per minute per region, batch concurrency — live in Google
 * Cloud's quota system, readable only through the separate Service Usage /
 * Cloud Quotas APIs and a different scope. Exhaustion surfaces as a 429 with
 * `error.status: RESOURCE_EXHAUSTED`, which the client raises with Google's
 * message intact.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Vertex AI's discovery document declares no rate-limit or quota response headers and no " +
      "headroom endpoint (verified 2026-10-05). Per-model, per-region limits live in Google " +
      "Cloud's quota system, readable only through the Cloud Quotas / Service Usage APIs. " +
      "Exhaustion surfaces as a 429 RESOURCE_EXHAUSTED.",
  },
};

export default quota;
