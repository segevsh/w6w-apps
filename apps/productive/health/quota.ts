import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Productive documents three request ceilings (100 requests / 10 s per token, 4,000 / 30 min
 * per organization, 10 / 30 s on `/reports`) and two server-time budgets (30 min per hour,
 * 6 h per day per organization), and says a `429` carries `X-RateLimit-Reset`. It documents no
 * remaining-count header and no usage endpoint, and an unsigned 401 carries no `X-RateLimit-*`
 * header of any kind (measured 2026-10-06), so headroom is not observable before it runs out.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Productive documents request and server-time ceilings (100 requests per 10 s per " +
      "token, 4,000 per 30 min per organization, 30 min of processing per hour) but exposes " +
      "no remaining-count header and no usage endpoint; headroom only shows up as a 429 with " +
      "X-RateLimit-Reset after it has been exceeded.",
  },
};

export default quota;
