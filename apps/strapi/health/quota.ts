import type { HealthCheckDefinition } from "@w6w/types";

/**
 * No standard "headroom before throttling" signal exists across arbitrary
 * Strapi instances. Strapi ships no built-in API rate-limit or request-quota
 * endpoint; any throttling is whatever a reverse proxy, hosting provider, or
 * a custom middleware imposes on a given deployment. Declared rather than
 * omitted, for the same reason as the absent status service: a host should
 * be able to tell "we cannot know" from "nobody looked".
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
    reason: "Strapi exposes no standard rate-limit/quota API; any throttling is imposed by " +
      "whatever reverse proxy, hosting provider, or custom middleware a given deployment runs.",
  },
};

export default quota;
