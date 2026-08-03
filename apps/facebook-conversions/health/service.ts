import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Meta publishes nothing a machine can read. Re-verified 2026-08-03 rather than
 * inherited from the sibling apps: `metastatus.com`, `metastatus.com/rss`,
 * `metastatus.com/feed` and `metastatus.com/api/v1/status` all answer
 * `200 text/html` — the site is a single-page app that serves its shell for
 * every path, so there is no Atom/RSS document to name in `feed` and no JSON
 * document to parse. The developer view at
 * developers.facebook.com/status/dashboard is the same story.
 *
 * Declaring that is a positive fact, not an omission: a host can render "not
 * knowable" instead of leaving an operator to conclude the publisher forgot.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any
 * other severity a declared absence would pin every verdict at `unknown`
 * forever. Informational checks never worsen a verdict; they are carried for
 * display.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Meta platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Meta's status site (metastatus.com, and the developer view at developers.facebook.com/status/dashboard) is a single-page human page — every path, including /rss and /feed, returns text/html, so there is no feed or JSON API to read. The `quota` check reading `X-App-Usage` and `X-Business-Use-Case-Usage` is the closest automatable proxy for platform health.",
  },
};

export default service;
