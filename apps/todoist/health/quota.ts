import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Todoist meters requests but exposes no headroom to read — the REST v2
 * responses carry no `X-RateLimit-*` / `RateLimit-*` headers, and there is no
 * dedicated limits endpoint. So there is nothing to probe. Declared rather than
 * omitted, for the same reason as an absent status service: a host should be
 * able to tell "we cannot know" from "nobody looked".
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and
 * an informational check never worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Todoist's REST v2 returns no rate-limit headers and publishes no headroom endpoint. The documented allowance is 1000 requests per 15 minutes per user token, enforced by a 429 rather than reported.",
  },
};

export default quota;
