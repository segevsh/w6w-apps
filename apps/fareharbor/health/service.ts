/**
 * Is FareHarbor up? — its Statuspage, with a caveat about what the page covers.
 *
 * ## The page is real (checked 2026-10-06)
 *
 * `status.fareharbor.com/api/v2/summary.json` answers 200 JSON in Statuspage v2 shape:
 * `page.name` "FareHarbor", page id `d45pv7z52qcf`, `page.url` `https://status.fareharbor.com`.
 * `fareharbor.statuspage.io` serves the identical page (same id). 41 components in groups
 * (Online Booking, Payments, Client Websites, Integrations, Notifications, Client support, ...).
 *
 * ## No component is called "API"
 *
 * Nothing on the page names the External API. The surfaces the API actually drives are
 * availability (`Calendar`), booking (`Booking`) and the booking-change notifications
 * (`Booking Webhook`) — those three decide the verdict, by component id. Everything else
 * (payments, the websites, support lines, the OTA and accounting integrations) is reported
 * as detail but cannot make this app `down`. That mapping is an inference, not something the
 * vendor states, which is why the check is `informational`: it can never pin the app's roll-up
 * on a guess. A page-level roll-up would have reported the API down because `Support Phone
 * Lines` or `Square Integration` is.
 *
 * `unknown`, never `down`, when the page itself fails: a broken status page says nothing about
 * the API.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_HOST = "status.fareharbor.com";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;
export const PAGE_ID = "d45pv7z52qcf";

/** Components the External API drives — these decide the verdict. */
export const API_COMPONENTS: Record<string, string> = {
  "y76b7n56fwt0": "Booking",
  "9pn511bj2dbh": "Calendar",
  "7731wxwfg5yw": "Booking Webhook",
};

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string };
  components?: StatusComponent[];
  incidents?: unknown[];
}

/** Statuspage's component vocabulary, mapped onto our four states. */
export function mapComponentStatus(status: string | undefined): HealthState {
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
  title: "FareHarbor platform status",
  description:
    "status.fareharbor.com. Booking, Calendar and Booking Webhook — the surfaces the External " +
    "API drives — decide the verdict; every other component is reported but cannot make the " +
    "app down. The page has no component named API, so this mapping is an inference.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };
    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };
    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "status page no longer is FareHarbor's (page id moved)" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page listed no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    const deciding: HealthState[] = [];
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      const key = node.id ?? node.name!;
      components[key] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
      if (node.id && API_COMPONENTS[node.id]) deciding.push(state);
    }
    if (deciding.length === 0) {
      return { state: "unknown", message: "none of the Booking/Calendar/Webhook components found" };
    }

    const affected = nodes.filter((n) =>
      n.id && API_COMPONENTS[n.id] && n.status !== "operational"
    );
    return {
      state: worstHealthState(deciding),
      message: affected.length
        ? `affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`
        : undefined,
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
