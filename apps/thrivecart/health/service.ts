/**
 * Is ThriveCart up? — declared absent, not faked.
 *
 * `status.thrivecart.com/api/v2/summary.json` returns 404 (checked
 * 2026-08-15), and neither `thrivecart.com` nor `developers.thrivecart.com`
 * links to a status page anywhere. There is nothing machine-readable to
 * probe or parse, so `w6w.network.allow` intentionally does not include a
 * status host — an App has no business reaching one from an Action, and
 * there is no health hook here to reach it from either.
 *
 * `unavailable` is a first-class, honest answer per
 * `rfcs/healthcheck.md` "Declaring absence" — better than a silent gap or a
 * `check` that always returns `unknown`. `severity: "informational"` so this
 * entry never pins the App's roll-up verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "ThriveCart platform status",
  description: "No machine-readable status surface: status.thrivecart.com/api/v2/summary.json " +
    "returns 404, and no status page is linked from thrivecart.com or developers.thrivecart.com.",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "ThriveCart publishes no status page or status API to probe.",
  },
};

export default service;
