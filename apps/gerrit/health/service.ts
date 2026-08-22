import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Vendor status — declared **unavailable**, because there is no vendor.
 *
 * ## Gerrit is a project, not a service
 *
 * It is Apache-licensed software that organisations run themselves: Google,
 * the Android and Chromium projects, Wikimedia, Eclipse, and a great many
 * companies on their own hardware. `gerritcodereview.com` is the project's
 * documentation site and publishes no status feed, because it does not run
 * anybody's Gerrit.
 *
 * That is the same shape of absence as `apps/mastodon` — software many people
 * run rather than a service one company operates — and it is why the
 * connection-scoped `instance` check is the only one that could mean anything.
 *
 * ## The instances that do publish status do it privately
 *
 * A large Gerrit usually sits behind an organisation's own status page, at an
 * address only that organisation knows, with no convention for discovering the
 * one belonging to a given host. There is nothing to look up.
 */
const check: HealthCheckDefinition = {
  key: "service",
  kind: "service",
  scope: "app",
  credential: "none",
  title: "Gerrit status",
  description:
    "Declared unavailable — there is no Gerrit service to have a status. It is software " +
    "organisations run themselves, and the project's own site publishes no feed because it " +
    "operates nobody's instance. The `instance` check reads the connection's own server.",
  covers: ["service"],
  severity: "informational",
  unavailable: {
    reason:
      "There is no Gerrit service. Gerrit is Apache-licensed software that organisations run " +
      "themselves — Google, Android, Chromium, Wikimedia, Eclipse and many companies on their " +
      "own hardware — so every deployment is separate and an incident on one says nothing about " +
      "another. gerritcodereview.com is the project's documentation site and publishes no " +
      "status feed, because it does not operate anybody's instance. The same shape of absence " +
      "as apps/mastodon. Large instances often sit behind an organisation's own status page, at " +
      "an address only that organisation knows and with no convention for discovering it. The " +
      "`instance` check probes the connection's own host through an unauthenticated endpoint, " +
      "which is the answerable version of the question.",
  },
};

export default check;
