import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is the Lofty API up?
 *
 * ## The status page is a real Statuspage, and it has an API component
 *
 * `status.lofty.com` answers Statuspage v2 JSON
 * (`GET /api/v2/summary.json`, read 2026-09-22; `page.name` is "Lofty"). Its
 * components are `Lofty`, `Site`, `Listing`, `Dialer`, `Loftyworks` and one
 * named exactly **`API`**.
 *
 * Only the `API` component is a statement about this app: every request this
 * app makes goes to `api.lofty.com`, and a dialer or listing-site incident that
 * leaves the API healthy is not this app's problem. So the verdict here is the
 * `API` component alone — the rest of the page is reported as `components`
 * detail rather than rolled into the answer.
 *
 * ## Component names are matched, never ids
 *
 * The `API` component carries an id (`5kbf3pm0lcxg` when read), but ids change
 * when a component is recreated and this app should not have to be redeployed
 * when they do. The check matches the name, anchored so that a future
 * component called "API Gateway" or "Public API" is not silently substituted
 * for the one that answers `api.lofty.com`.
 *
 * ## Severity
 *
 * `informational`: a vendor incident is evidence, not a verdict on a given
 * workflow — the outage this page reports may fall entirely outside the subset
 * of the API one connection uses. `credential: "none"` is the default for this
 * kind and is the precondition for the `network` widening below: a status host
 * must never see a Lofty API key, and this hook is never given one.
 */
export const STATUS_URL = "https://status.lofty.com/api/v2/summary.json";

/** The status host, reachable only inside this hook's worker. */
export const STATUS_HOST = "status.lofty.com";

/** The one component this app's verdict follows. Anchored — not a substring. */
export const API_COMPONENT = /^api$/i;

interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

interface StatuspageSummary {
  page?: { id?: string; name?: string; url?: string };
  status?: { indicator?: string; description?: string };
  components?: StatuspageComponent[];
}

/** Statuspage's documented component vocabulary. */
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

/** A stable key for a reported component. */
export function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Lofty API status",
  description: "The `API` component of Lofty's status page (status.lofty.com), which answers " +
    "`api.lofty.com`. The page's other components (Site, Listing, Dialer, Loftyworks) are " +
    "reported as detail but do not drive the verdict — they are different products.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "unknown", message: `could not reach the status page: ${String(err)}` };
    }
    if (!res.ok) {
      await res.body?.cancel();
      // A broken status page says nothing about Lofty — never `down`.
      return { state: "unknown", message: `the status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatuspageSummary | null;
    if (!body?.components) {
      return { state: "unknown", message: "the status page did not return its components" };
    }
    if (!/lofty/i.test(body.page?.name ?? "")) {
      return {
        state: "unknown",
        message: "the status page no longer self-identifies as Lofty's",
      };
    }

    // Every non-group component, as detail. The verdict comes from `API` alone.
    const components: Record<string, HealthComponentReport> = {};
    for (const [index, component] of body.components.entries()) {
      const name = (component.name ?? "").trim();
      if (!name || component.group === true) continue;
      const state = mapComponentStatus(component.status);
      components[slug(name) || `component-${index}`] = state === "ok"
        ? { state }
        : { state, message: component.status };
    }

    const api = body.components.find(
      (component) => component.group !== true && API_COMPONENT.test((component.name ?? "").trim()),
    );
    if (!api) {
      // The page is Lofty's but no longer has the component this app follows.
      return {
        state: "unknown",
        message: 'the status page has no component named "API"',
        components,
      };
    }

    const state = mapComponentStatus(api.status);
    return {
      state,
      message: state === "ok"
        ? `${api.name} operational`
        : `${api.name}: ${api.status ?? "status not reported"}`,
      components,
      ttlSeconds: 300,
    };
  },
};

export default service;
