/**
 * Is Digistore24 up?
 *
 * ## The status page is real — checked 2026-10-05
 *
 * `status.digistore24.com` is an Atlassian Statuspage.
 *
 *   - `/api/v2/summary.json` answers 200 `application/json`, 903 bytes, in
 *     the Statuspage v2 schema (`status.indicator` present).
 *   - A bogus sibling `/api/v2/definitely-not-real-zzz.json` answers **404**,
 *     so it is not a catch-all.
 *   - `page` = `{id: "xzdmyb5vgf0p", name: "Digistore24"}`, and the page has
 *     exactly two components: `Digistore24` (the platform, which carries the
 *     API) and `Digibiz24` (a separate product).
 *
 * ## Scoped to the `Digistore24` component
 *
 * The page-level indicator would turn `degraded` for a Digibiz24 incident,
 * which says nothing about this API. The check therefore reads the
 * `Digistore24` component only, falling back to the page indicator if the
 * component is ever renamed away.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.digistore24.com/api/v2/summary.json";
export const PAGE_ID = "xzdmyb5vgf0p";
export const COMPONENT_ID = "fv0yxgqlplc8";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string }>;
  status?: { indicator?: string; description?: string };
}

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

export function mapIndicator(indicator: string | undefined): HealthState {
  switch (indicator) {
    case "none":
      return "ok";
    case "minor":
    case "major":
    case "maintenance":
      return "degraded";
    case "critical":
      return "down";
    default:
      return "unknown";
  }
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Digistore24 platform status",
  description:
    "Status of the Digistore24 component on status.digistore24.com (the platform and its API). " +
    "The page's other component, Digibiz24, is a separate product and is not read.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.digistore24.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Pin the page by id: a redirect or rebrand must not silently point us at someone else's.
    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "status page no longer identifies as Digistore24's" };
    }

    const component = (body.components ?? []).find((c) =>
      c?.group !== true && (c?.id === COMPONENT_ID || c?.name === "Digistore24")
    );

    let state: HealthState;
    const notes: string[] = [];
    if (component) {
      state = mapComponentStatus(component.status);
      if (state !== "ok") notes.push(`${component.name}: ${component.status}`);
    } else if (body.status?.indicator !== undefined) {
      state = mapIndicator(body.status.indicator);
      notes.push("Digistore24 component not found; using the page-level indicator");
    } else {
      return { state: "unknown", message: "Status page carried no Digistore24 component" };
    }

    if (state !== "ok" && body.status?.description) notes.push(body.status.description);
    const open = body.incidents?.length ?? 0;
    if (open > 0) notes.push(`${open} open incident(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      ttlSeconds: 60,
    };
  },
};

export default service;
