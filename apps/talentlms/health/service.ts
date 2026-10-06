import type { HealthCheckDefinition } from "@w6w/types";

/**
 * TalentLMS publishes a status page at `status.talentlms.com`, but it is a
 * bespoke HTML page (34,686 bytes, `<title>TalentLMS Status Page</title>`) with
 * no machine-readable feed: `/api/v2/summary.json`, `/api/v2/status.json`,
 * `/api/v2/components.json`, `/summary.json`, `/index.json`, `/rss` and
 * `/history.atom` all answer 404 HTML, and `talentlms.statuspage.io` redirects
 * to statuspage.io's marketing root. Scraping the HTML for a verdict would be
 * guesswork, so this is a declared absence. The `quota` check, which is signed,
 * is the live probe of the API itself.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "TalentLMS platform status",
  kind: "service",
  severity: "informational",
  covers: ["*"],
  unavailable: {
    reason:
      "TalentLMS's status page (status.talentlms.com) is HTML only: every JSON, RSS and Atom path " +
      "on it answers 404, and talentlms.statuspage.io is not a claimed page. The `quota` check " +
      "probes the API itself with the connection's credential.",
  },
};

export default service;
