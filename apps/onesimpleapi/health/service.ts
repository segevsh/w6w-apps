/**
 * Is OneSimpleApi up? — declared absent, not faked.
 *
 * onesimpleapi.com publishes no public status page or status subdomain:
 * `/status`, `/uptime`, `/statuspage`, `/api/status` and `status.onesimpleapi.com`
 * all 404 or fail to resolve (checked 2026-08-01), and the site's homepage
 * carries no link to one. There is therefore nothing machine-readable to
 * probe or declare a `feed` against, so this says so honestly instead of
 * faking a check or leaving a silent gap.
 *
 * `unavailable` is a first-class, honest answer per rfcs/healthcheck.md
 * "Declaring absence" — better than a silent gap or a `check` that always
 * returns `unknown`. `severity: "informational"` so this entry never pins the
 * App's roll-up verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "OneSimpleApi platform status",
  description: "No machine-readable status surface: onesimpleapi.com publishes no status page.",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "onesimpleapi.com publishes no status page, status subdomain, or RSS/Atom/JSON status feed.",
  },
};

export default service;
