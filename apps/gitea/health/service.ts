/**
 * Is Gitea up? — the question does not apply, and saying so is the point.
 *
 * Gitea is **self-hosted software, not a service**. There is no vendor running
 * the instance this connection points at, so there is nothing a vendor status
 * page could tell you about it. `instance` is the check that answers the real
 * question, by asking the server itself.
 *
 * The project does run `status.gitea.com` for its own hosted `gitea.com`, and
 * it is worth recording why that is not used here. Verified 2026-08-18: it is
 * an UptimeRobot page serving HTML, with no JSON, RSS or Atom at
 * `/index.json`, `/feed.rss` or the usual UptimeRobot heartbeat paths — all
 * 404. And even if it published one, it would describe `gitea.com`
 * specifically, which is one instance among many and almost certainly not
 * yours.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict — an
 * app whose vendor has nothing to be up is not a degraded app.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Gitea platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Gitea is self-hosted software, so there is no vendor platform behind a connection — the " +
      "`instance` check asks this connection's own server instead. The project's " +
      "status.gitea.com covers its hosted gitea.com only, and publishes nothing " +
      "machine-readable: verified 2026-08-18 it is an UptimeRobot page serving HTML, with " +
      "/index.json, /feed.rss and the UptimeRobot heartbeat paths all returning 404.",
  },
};

export default service;
