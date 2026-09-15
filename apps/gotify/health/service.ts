/**
 * Is Gotify up? — the question does not apply, and saying so is the point.
 *
 * Gotify is **self-hosted software, not a service**: there is no vendor
 * running the instance a connection points at, so there is nothing a vendor
 * status page could report about it. `instance` is the check that answers
 * the real question, by asking the server itself.
 *
 * There is also no gotify.net status page to defer to in the first place —
 * the project's site (`gotify.net`) is documentation and a GitHub Pages
 * redirect, not a hosted product with its own uptime to report.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict — an
 * app whose vendor has nothing to be up is not a degraded app.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Gotify platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Gotify is self-hosted software, so there is no vendor platform behind a connection — " +
      "the `instance` check asks this connection's own server instead. gotify.net is " +
      "documentation for the project, not a hosted product with a status of its own.",
  },
};

export default service;
