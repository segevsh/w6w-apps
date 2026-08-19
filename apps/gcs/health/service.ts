import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Google Cloud Storage up?
 *
 * ## The feed is an archive, and reading it as a status board is wrong
 *
 * `status.cloud.google.com/incidents.json` is not a Statuspage summary. It is
 * a rolling list of **recent incidents**, and measured on 2026-08-19 it held
 * **four entries, every one of them already closed** — each with an `end`
 * timestamp. A check that asks "is Cloud Storage mentioned in here" reports an
 * outage that finished last month, permanently.
 *
 * So the only entries that matter are the ones with **no `end`**. Everything
 * else is history.
 *
 * ## An incident affecting Storage is usually not *named* Storage
 *
 * Google files a multi-product outage under `service_name: "Multiple Products"`
 * with a `service_key` of `zall`, and lists the real products in
 * **`affected_products`**. Three of the four incidents in the live feed were
 * exactly that shape.
 *
 * Matching on `service_name` therefore misses every large outage — precisely
 * the ones worth knowing about — while catching the small single-product ones.
 * This check reads `affected_products` and matches on the product **id**,
 * because the names are ambiguous too: `Cloud Storage for Firebase` is a
 * different product with a different id, and a substring match on "Storage"
 * catches it and `Storage Transfer Service` as well.
 *
 * ## `severity` is not the field to read
 *
 * `status_impact` is: `SERVICE_DISRUPTION` is an outage, `SERVICE_INFORMATION`
 * is a notice. An incident can be `severity: "low"` and still be a disruption.
 */
export const STATUS_URL = "https://status.cloud.google.com/incidents.json";

/** Google Cloud Storage's product id on the status board. */
export const PRODUCT_ID = "UwaYoXQ5bHYHG6EdiPB8";

interface Incident {
  id?: string;
  external_desc?: string;
  service_name?: string;
  service_key?: string;
  severity?: string;
  status_impact?: string;
  /** Absent or null while the incident is still open. */
  end?: string | null;
  affected_products?: Array<{ id?: string; title?: string }>;
  currently_affected_locations?: Array<{ id?: string; title?: string }>;
}

/** Whether an incident is still happening. */
export function isOpen(incident: Incident): boolean {
  return !incident?.end;
}

/** Whether an incident touches Cloud Storage, by product id rather than name. */
export function affectsStorage(incident: Incident): boolean {
  return (incident?.affected_products ?? []).some((product) => product?.id === PRODUCT_ID);
}

const check: HealthCheckDefinition = {
  key: "service",
  kind: "service",
  scope: "app",
  credential: "none",
  title: "Cloud Storage status",
  description:
    "Reads Google Cloud's incident feed for OPEN incidents affecting Cloud Storage by product " +
    "id. The feed is an archive of recent incidents — most entries are already closed — and a " +
    "multi-product outage is filed under 'Multiple Products', so matching on the name misses " +
    "exactly the large ones.",
  covers: ["service"],
  severity: "informational",
  minIntervalSeconds: 120,
  network: { allow: ["status.cloud.google.com"] },

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return {
        state: "unknown",
        message: `could not reach the Google Cloud status feed: ${String(err)}`,
      };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "unknown", message: `the Google Cloud status feed answered ${res.status}` };
    }

    let incidents: Incident[] | null = null;
    try {
      incidents = await res.json() as Incident[];
    } catch {
      return { state: "unknown", message: "the Google Cloud status feed did not return JSON" };
    }
    if (!Array.isArray(incidents)) {
      return { state: "unknown", message: "the Google Cloud status feed was not a list" };
    }

    // Open, and affecting this product — not merely named after it.
    const relevant = incidents.filter((incident) => isOpen(incident) && affectsStorage(incident));

    if (!relevant.length) {
      return {
        state: "ok",
        message: "no open Google Cloud incident affects Cloud Storage",
      };
    }

    const disruptions = relevant.filter((incident) =>
      incident?.status_impact === "SERVICE_DISRUPTION" ||
      incident?.status_impact === "SERVICE_OUTAGE"
    );
    const locations = [
      ...new Set(
        relevant.flatMap((incident) =>
          (incident.currently_affected_locations ?? []).map((location) => location?.title)
        ).filter(Boolean) as string[],
      ),
    ];

    return {
      // An outage is regional far more often than global, so this does not
      // claim `down` for the whole service.
      state: disruptions.length ? "degraded" : "ok",
      message: `${relevant.length} open incident${relevant.length === 1 ? "" : "s"} affecting ` +
        `Cloud Storage: ${
          relevant.map((incident) => incident.external_desc).filter(Boolean)[0] ??
            "no description"
        }` +
        (locations.length ? ` (${locations.slice(0, 4).join(", ")})` : ""),
    };
  },
};

export default check;
