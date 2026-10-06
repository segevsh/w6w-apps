/**
 * Is Lodgify up? — no usable status feed exists to ask.
 *
 * Checked live 2026-10-05:
 *
 *   - `status.lodgify.com` (and its `/api/v2/summary.json` and `/index.json`) answer
 *     `403` with Cloudflare's "Just a moment..." bot-challenge page to a non-browser
 *     client, so nothing machine-readable can be fetched by a host-side probe.
 *   - `lodgify.statuspage.io/api/v2/summary.json` is the unclaimed-Statuspage decoy: it
 *     redirects to `https://www.atlassian.com/software/statuspage` (127,696 bytes of
 *     Atlassian marketing HTML), not a Lodgify board.
 *   - The API docs (docs.lodgify.com) name no status host.
 *
 * So the absence is declared and `w6w.network.allow` is `["api.lodgify.com"]` only.
 * `severity: "informational"` is load-bearing: an `unavailable` entry always reports
 * `unknown`, which would otherwise pin the app's verdict forever. The `api` and
 * `reachability` probes plus the derived `auth:api-key` check are the signals.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Lodgify platform status",
  description: "No machine-readable status feed: status.lodgify.com is behind a Cloudflare bot " +
    "challenge and lodgify.statuspage.io is an unclaimed decoy.",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Lodgify's status page, status.lodgify.com, answers 403 with a Cloudflare " +
      '"Just a moment..." challenge to non-browser clients (checked live 2026-10-05, including ' +
      "/api/v2/summary.json and /index.json), so no feed can be read host-side; " +
      "lodgify.statuspage.io is an unclaimed decoy that redirects to atlassian.com's Statuspage " +
      "marketing page. The `api` and `reachability` probes and the derived auth:api-key check " +
      "are the automatable signals.",
  },
};

export default service;
