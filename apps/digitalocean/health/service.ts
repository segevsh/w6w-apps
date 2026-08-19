import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is DigitalOcean up — and which product, in which region?
 *
 * ## A component's name is not its identity on this board
 *
 * Measured on 2026-08-19: `status.digitalocean.com`'s summary lists **256
 * components**, of which 17 are groups. And the names repeat, heavily:
 *
 * | Component name | Times it appears |
 * | --- | --- |
 * | `Global` | **15** |
 * | `MKC1` | 14 |
 * | `ATL1`, `AMS3`, `FRA1`, `SFO3` | 13 each |
 *
 * `Global` appears once per product group; each region code appears once per
 * product that runs there. So "FRA1 is down" is meaningless on its own — the
 * question is *which product* in FRA1, and the component name does not say.
 *
 * A check matching on name would conflate Droplets in Frankfurt with Volumes in
 * Frankfurt and Kubernetes in Frankfurt. **The only identity is the pair
 * `(group, component)`**, resolved through `group_id`, and that is what this
 * reports: `Droplets / FRA1`.
 *
 * ## The API is a top-level component, and it is the one this app needs
 *
 * `API` sits outside any group. When it is out, every action here fails and
 * every existing droplet keeps serving traffic. When a *product* in a region is
 * out, the API answers fine and the resources are affected — the same split as
 * `apps/particle`, for the same reason.
 *
 * ## This never claims a full outage
 *
 * DigitalOcean incidents are nearly always one product in one or two regions,
 * out of 256 components. The check is app-scoped and does not know which region
 * a workflow's droplets are in, so it reports what is affected and leaves the
 * relevance to the caller.
 */
export const STATUS_URL = "https://status.digitalocean.com/api/v2/summary.json";

/** The component this app itself depends on. It is not in any group. */
export const API_COMPONENT = "API";

interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

interface Summary {
  page?: { name?: string };
  components?: StatuspageComponent[];
}

/** Statuspage's vocabulary, mapped onto the health states. */
export function mapComponentStatus(status: string | undefined): "ok" | "degraded" | "down" {
  switch (status) {
    case "operational":
      return "ok";
    case "major_outage":
      return "down";
    case "degraded_performance":
    case "partial_outage":
    case "under_maintenance":
      return "degraded";
    default:
      return "degraded";
  }
}

/**
 * `Droplets / FRA1` — the only form in which a component on this board is
 * identifiable, because 15 components are called `Global` and 13 are called
 * `FRA1`.
 */
export function qualifiedName(
  component: StatuspageComponent,
  byId: Map<string, StatuspageComponent>,
): string {
  const name = String(component?.name ?? "component");
  const parentId = component?.group_id;
  const parent = parentId ? byId.get(parentId) : undefined;
  return parent?.name ? `${parent.name} / ${name}` : name;
}

const check: HealthCheckDefinition = {
  key: "service",
  kind: "service",
  scope: "app",
  credential: "none",
  title: "DigitalOcean status",
  description:
    "Reads status.digitalocean.com, resolving every component through its GROUP — 15 components " +
    "are called `Global` and 13 are called `FRA1`, so a name alone identifies nothing. Separates " +
    "the API, which this app needs, from products in regions, which affect the resources.",
  covers: ["service"],
  severity: "informational",
  minIntervalSeconds: 120,
  network: { allow: ["status.digitalocean.com"] },

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return {
        state: "unknown",
        message: `could not reach the DigitalOcean status page: ${String(err)}`,
      };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "unknown", message: `the DigitalOcean status page answered ${res.status}` };
    }

    let body: Summary | null = null;
    try {
      body = await res.json() as Summary;
    } catch {
      return { state: "unknown", message: "the DigitalOcean status page did not return JSON" };
    }

    const components = body?.components ?? [];
    if (!components.length) {
      return { state: "unknown", message: "the DigitalOcean status page listed no components" };
    }

    const byId = new Map(
      components.filter((component) => component?.id).map((
        component,
      ) => [component.id!, component]),
    );

    // The API component is top-level, so it is the one identifiable by name.
    const api = components.find((component) =>
      component?.name === API_COMPONENT && !component?.group_id
    );
    if (!api) {
      return {
        state: "unknown",
        message: `no top-level "${API_COMPONENT}" component is on the status page — it lists ` +
          `${components.length} components and the board has been reorganised`,
      };
    }
    const apiState = mapComponentStatus(api.status);

    // Groups roll up their children, so counting both double-counts.
    const affected = components.filter((component) =>
      !component?.group && component !== api &&
      mapComponentStatus(component?.status) !== "ok"
    );

    if (apiState === "ok" && !affected.length) {
      return { state: "ok", message: "the DigitalOcean API and all products are operational" };
    }

    const componentStates: Record<string, { state: "ok" | "degraded" | "down"; message?: string }> =
      {};
    if (apiState !== "ok") componentStates["api"] = { state: apiState, message: api.status };
    for (const component of affected.slice(0, 12)) {
      const key = qualifiedName(component, byId).toLowerCase().replace(/[^a-z0-9]+/g, "-");
      componentStates[key] = {
        state: mapComponentStatus(component?.status),
        message: component?.status,
      };
    }

    const parts: string[] = [];
    if (apiState !== "ok") {
      parts.push(
        `the API is ${api.status} — every action here fails, and existing droplets keep ` +
          "serving traffic",
      );
    }
    if (affected.length) {
      // Qualified, because a bare component name identifies nothing here.
      const named = affected.slice(0, 6).map((component) => qualifiedName(component, byId));
      parts.push(
        `${affected.length} product/region component(s) affected: ${named.join(", ")}${
          affected.length > 6 ? ", and others" : ""
        }`,
      );
    }

    return {
      // Incidents here are nearly always one product in one or two regions out
      // of 256 components, and this check does not know where a workflow's
      // resources are.
      state: apiState === "down" ? "down" : "degraded",
      message: parts.join(". "),
      components: componentStates,
    };
  },
};

export default check;
