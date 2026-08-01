import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is PostHog up? — checked live 2026-08-01, and the honest answer is "no
 * documented, stable way to ask".
 *
 * PostHog's status page lives at https://status.posthog.com, which redirects
 * to https://www.posthogstatus.com — a bespoke Next.js app, NOT an Atlassian
 * Statuspage instance (unlike Mailgun's `status.mailgun.com` in this pack).
 * It publishes no Atom/RSS feed (`/history.rss`, `/feed/*` all 404) and no
 * documented JSON API. Probing the live site turns up an internal
 * `GET /api/status` route that happens to return well-formed JSON
 * (`overall_status`, `component_groups[].components[].status`, mirroring the
 * US/EU split this app's `region` field also uses) — but it is unversioned,
 * unlinked from the page's own markup, and appears nowhere in PostHog's
 * documentation. That is the signature of an internal implementation detail
 * of their frontend, not a published contract: it could rename, restructure
 * or disappear without notice, and depending on it here would be exactly the
 * kind of invented integration this app is supposed to avoid.
 *
 * So: declared absent, honestly, per rfcs/healthcheck.md — a better answer
 * than silently omitting the check or guessing from an undocumented probe.
 * `severity: "informational"` is load-bearing: an `unavailable` entry always
 * reports `unknown`, which outranks `ok` in the roll-up, so at any other
 * severity this would pin every verdict at `unknown` forever. The derived
 * `auth:personal-api-key` check (`/api/users/@me/`) is the only real
 * liveness signal this app can offer.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "PostHog platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "PostHog's status page (status.posthog.com -> www.posthogstatus.com) is a custom app, not Atlassian Statuspage, and publishes no documented JSON or Atom/RSS feed to probe. The derived `auth:personal-api-key` check is the only liveness signal that exists.",
  },
};

export default service;
