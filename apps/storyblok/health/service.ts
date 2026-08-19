import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Vendor status — declared **unavailable**, and measured.
 *
 * ## The status page exists and publishes nothing readable
 *
 * `status.storyblok.com` redirects to `uptime.storyblok.com`, which serves an
 * HTML page and no JSON. Probed on 2026-08-19: neither the Statuspage
 * (`/api/v2/summary.json`) nor the common alternatives answer — the first
 * returns the HTML redirect and the second a 404. There is a page a person can
 * read and nothing a check can.
 *
 * ## And a status page would not answer the question anyway
 *
 * Storyblok's two APIs fail independently and for different reasons. The
 * delivery API is a CloudFront distribution serving cached JSON; it survives
 * outages of the thing that fills it. The Management API is the application.
 * So "Storyblok is up" is at least two questions, and the one that matters to
 * a given connection depends on which credential it holds.
 *
 * `health/api.ts` answers the version that can be answered: whether **this**
 * connection's API is responding.
 */
const check: HealthCheckDefinition = {
  key: "service",
  kind: "service",
  scope: "app",
  credential: "none",
  title: "Storyblok status",
  description:
    "Declared unavailable — measured, Storyblok's status page publishes no machine-readable " +
    "feed. It would also answer the wrong question: the delivery CDN and the Management API " +
    "fail independently, and `api` probes whichever this connection uses.",
  covers: ["service"],
  severity: "informational",
  unavailable: {
    reason: "Storyblok publishes no machine-readable status. Measured on 2026-08-19: " +
      "`status.storyblok.com` serves a meta-refresh to `uptime.storyblok.com`, which returns " +
      "HTML; `/api/v2/summary.json` on both hosts returns the page or a 404, so there is no " +
      "Statuspage feed behind it. A feed would also be the wrong instrument here — the Content " +
      "Delivery API is a CloudFront distribution serving cached JSON and survives outages of " +
      "the system that fills it, while the Management API is the application itself, so the two " +
      "fail separately and a connection only cares about the one its credential uses. The `api` " +
      "check probes that one directly.",
  },
};

export default check;
