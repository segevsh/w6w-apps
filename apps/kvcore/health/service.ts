/**
 * Is the kvCORE API up?
 *
 * ## The status page is real, checked two ways on 2026-09-29
 *
 * Inside Real Estate publishes at **`status.insiderealestate.com`**, an
 * Atlassian Statuspage (`status.insiderealestate.com/api/v2/summary.json`
 * and the equivalent `insiderealestate.statuspage.io` alias both answer the
 * identical 6,686-byte JSON document).
 *
 * **(a) Does the page describe THIS product?** Yes — `page.name` is
 * "Inside Real Estate", and its 18 components (in one group, "Back Office")
 * are Inside Real Estate's own product line: "BoldTrail CRM", "kvCORE CRM",
 * "kvCORE Mobile Apps", "Websites - kvCORE & BoldTrail", "IDX and Listings",
 * "BrokerSumo (CORE BackOffice)", and so on.
 *
 * **(b) Is there a component for THIS API specifically?** Yes — one is
 * literally named **"kvCORE API"** (id `c2wp8qycvr3p`), distinct from the
 * "kvCORE CRM" product component. This check reports that one component,
 * not the page-level roll-up, so an incident in an unrelated product line
 * (e.g. "CORE Listing Machine") never marks this API down.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. `credential: "none"`
 * is likewise the `kind: "service"` default, stated explicitly because it is
 * the precondition for the `network` widening below — a status host must
 * never see a kvCORE bearer token.
 */
import type { HealthCheckDefinition } from "@w6w/types";

export const STATUS_URL = "https://status.insiderealestate.com/api/v2/summary.json";

/** The vendor's own component id for "kvCORE API", pinned so a future rename is caught. */
export const API_COMPONENT_ID = "c2wp8qycvr3p";
export const API_COMPONENT_NAME = "kvCORE API";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { name?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
}

/** Statuspage's documented component vocabulary. */
function mapComponentStatus(status: string | undefined): "ok" | "degraded" | "down" | "unknown" {
  switch (status) {
    case "operational":
      return "ok";
    case "degraded_performance":
    case "partial_outage":
    case "under_maintenance":
      return "degraded";
    case "major_outage":
      return "down";
    default:
      return "unknown";
  }
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "kvCORE API status",
  description:
    'Reads the "kvCORE API" component from status.insiderealestate.com — Inside Real Estate\'s ' +
    "shared Statuspage across its whole product line, scoped here to just the API component.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.insiderealestate.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about kvCORE — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    if (body.page?.name && body.page.name !== "Inside Real Estate") {
      // Guards against a future redirect/rebrand silently pointing this
      // probe at someone else's page.
      return {
        state: "unknown",
        message: "status page no longer self-identifies as Inside Real Estate's",
      };
    }

    const api = (body.components ?? []).find((c) => c.id === API_COMPONENT_ID) ??
      (body.components ?? []).find((c) => c.name === API_COMPONENT_NAME);
    if (!api) {
      return {
        state: "unknown",
        message: `Status page no longer lists a "${API_COMPONENT_NAME}" component`,
      };
    }

    const state = mapComponentStatus(api.status);
    const relatedIncidents = (body.incidents ?? []).filter((i) =>
      (i.name ?? "").toLowerCase().includes("kvcore") ||
      (i.name ?? "").toLowerCase().includes("api")
    );

    return {
      state,
      message: state === "ok"
        ? undefined
        : `${API_COMPONENT_NAME}: ${api.status}${
          relatedIncidents.length > 0 ? `; ${relatedIncidents.map((i) => i.name).join(", ")}` : ""
        }`,
      components: {
        [API_COMPONENT_ID]: { state, message: `${API_COMPONENT_NAME}: ${api.status ?? "unknown"}` },
      },
      ttlSeconds: 60,
    };
  },
};

export default service;
