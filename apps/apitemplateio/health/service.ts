/**
 * Is APITemplate.io up? — declared absent, not faked.
 *
 * status.apitemplate.io is an UptimeRobot-hosted public status page. Unlike
 * Statuspage.io/Instatus, UptimeRobot's public status pages expose no RSS,
 * Atom, or JSON API surface (checked 2026-08-01: no `<link rel="alternate">`
 * feed tag in the page head, and `/feed`, `/history.rss` both 404). There is
 * therefore nothing machine-readable to probe or parse, and `w6w.network.allow`
 * intentionally does not include `status.apitemplate.io` — an App has no
 * business reaching a status host from an Action, and there is no health hook
 * here to reach it from either.
 *
 * `unavailable` is a first-class, honest answer per rfcs/healthcheck.md
 * "Declaring absence" — better than a silent gap or a `check` that always
 * returns `unknown`. `severity: "informational"` so this entry never pins the
 * App's roll-up verdict at `unknown` forever.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "APITemplate.io platform status",
  description:
    "No machine-readable status surface: status.apitemplate.io (UptimeRobot-hosted) publishes no RSS/Atom feed or JSON API.",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "status.apitemplate.io is an UptimeRobot public status page with no RSS/Atom/JSON surface to probe or parse.",
  },
};

export default service;
