import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is Google Maps Platform up?
 *
 * ## The feed, and why it is the Maps-specific one
 *
 * Google Cloud's status site publishes `incidents.json` per product family.
 * The top-level `status.cloud.google.com/incidents.json` covers Google Cloud
 * and — checked live 2026-08-18 — contains **no Maps products at all**: its
 * `affected_products` list has zero Maps entries, and
 * `status.cloud.google.com/products.json` likewise lists none. Maps Platform
 * has its own board, and its own feed:
 *
 *     https://status.cloud.google.com/maps-platform/incidents.json
 *
 * 14 incidents on the day it was read, with `service_name` values that are
 * unmistakably Maps: `Places API`, `Address Validation API`,
 * `Distance Matrix API`, `Weather API`, and `Multiple Products`. Using the
 * Cloud-wide feed here would have produced a check that was permanently green
 * because it was watching the wrong product.
 *
 * ## A history feed, read for current state — carefully
 *
 * This is an incident **log**, not a state summary, and `.claude`'s own note on
 * feeds is the right caution: a log of updates is not a statement of current
 * state. What makes it usable here is that each incident carries an `end`
 * timestamp, and an incident **without** one is still open. That is a positive
 * property of the document rather than an inference from ordering, so this
 * check reads exactly that and nothing else.
 *
 * `status_impact` gives the severity: `SERVICE_INFORMATION`,
 * `SERVICE_DISRUPTION`, `SERVICE_OUTAGE`.
 *
 * ## Why `informational`
 *
 * `scope: "app"`, so it cannot know which of the eight or so APIs a given
 * connection actually calls. An open incident on the Weather API says nothing
 * about a workflow that geocodes. The affected services are named in the
 * message and reported as components; the state is capped so a Maps-wide board
 * entry does not pin every connection to `down`.
 *
 * `credential: "none"` and load-bearing — the status host must never see the key.
 */
export const STATUS_URL = "https://status.cloud.google.com/maps-platform/incidents.json";

export interface CloudIncident {
  id?: string;
  begin?: string;
  end?: string;
  service_name?: string;
  service_key?: string;
  severity?: string;
  status_impact?: string;
  external_desc?: string;
}

/** Google's `status_impact` vocabulary. */
export function mapImpact(impact: string | undefined): HealthState {
  switch (impact) {
    case "SERVICE_OUTAGE":
      return "down";
    case "SERVICE_DISRUPTION":
      return "degraded";
    case "SERVICE_INFORMATION":
      return "degraded";
    default:
      return "unknown";
  }
}

/** An incident with no `end` has not been closed. */
export function isOpen(incident: CloudIncident): boolean {
  return !incident.end;
}

/** Slugify a service name into a stable component key. */
export function serviceKey(incident: CloudIncident, index: number): string {
  const name = incident.service_name;
  if (name) return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return incident.id ?? `incident-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Maps Platform status",
  description:
    "Open incidents from the Maps Platform status feed. It covers the whole platform, and this " +
    "check cannot know which APIs a connection calls — so it names the affected services and " +
    "stays informational.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: ["status.cloud.google.com"] },
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "unknown", message: `could not reach the status feed: ${String(err)}` };
    }
    if (!res.ok) {
      await res.body?.cancel();
      // A broken status feed says nothing about Google — never `down`.
      return { state: "unknown", message: `status feed returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as CloudIncident[] | null;
    if (!Array.isArray(body)) {
      return { state: "unknown", message: "the status feed did not return a JSON array" };
    }

    const open = body.filter(isOpen);
    if (open.length === 0) {
      return {
        state: "ok",
        message: `no open incidents (${body.length} in the feed's history)`,
        ttlSeconds: 300,
      };
    }

    const components: Record<string, HealthComponentReport> = {};
    open.forEach((incident, index) => {
      components[serviceKey(incident, index)] = {
        state: mapImpact(incident.status_impact),
        message: incident.external_desc?.slice(0, 200),
      };
    });

    return {
      // Capped: an incident on one Maps API is not an outage for a connection
      // that never calls it, and this hook cannot tell which is which.
      state: "degraded",
      message: `open: ${
        open.map((i) => `${i.service_name ?? "unknown service"} (${i.status_impact ?? "?"})`).join(
          ", ",
        )
      }`,
      components,
      ttlSeconds: 300,
    };
  },
};

export default service;
