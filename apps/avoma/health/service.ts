/**
 * Is the vendor up? — Avoma publishes no status page, and saying so is a positive fact.
 *
 * `status.avoma.com` does not resolve (`curl: (6) Could not resolve host`, measured
 * 2026-10-06), and neither the developer docs nor the OpenAPI document link to one. No page
 * means no `feed:` to declare and no component to read, so nothing is invented here. The live
 * signals are the `api` reachability check and the derived `auth:api-key` credential check.
 *
 * `severity: "informational"` is load-bearing: an `unavailable` entry always reports
 * `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other severity this would
 * pin the app's verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Avoma platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Avoma publishes no status page: status.avoma.com does not resolve and the " +
      "developer docs link to none. The `api` reachability check and the derived `auth:*` " +
      "check are the automatable signals.",
  },
};

export default service;
