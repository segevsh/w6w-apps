import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is the EZ Texting API up?
 *
 * `https://status.eztexting.com/api/v2/summary.json` is an Atlassian Statuspage, read live
 * 2026-10-06: `page.id` `nmm9j2skbrxf`, `page.name` "EZ Texting Status", with a dedicated
 * **"EZ Texting API"** component (group "EZ Texting Services"), alongside SMS/MMS pipeline
 * components. The page is shared with the sister CallFire product, which has its own "CallFire API"
 * component — so the verdict is anchored on the component named exactly "EZ Texting API", never on
 * the page-level indicator, which would turn red for a CallFire incident.
 *
 * - `operational` -> `ok`; degraded / partial outage / maintenance -> `degraded`;
 *   `major_outage` -> `down`; anything else, or no such component -> `unknown`, never `down`.
 */
export const STATUS_URL = "https://status.eztexting.com/api/v2/summary.json";
export const API_COMPONENT = "ez texting api";

interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatuspageSummary {
  page?: { id?: string; name?: string; url?: string };
  status?: { indicator?: string; description?: string };
  components?: StatuspageComponent[];
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

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "EZ Texting API status",
  description:
    'Component status from status.eztexting.com, anchored on its dedicated "EZ Texting API" ' +
    "component. The SMS/MMS pipeline components are reported alongside but do not decide the " +
    "verdict, and neither do CallFire's.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.eztexting.com"] },
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
      return { state: "unknown", message: `status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatuspageSummary | null;
    if (!body?.components) {
      return { state: "unknown", message: "the status page did not return its components" };
    }

    const named = body.page?.name ?? "";
    if (!/ez\s?texting/i.test(named)) {
      return {
        state: "unknown",
        message: named
          ? `the status page no longer self-identifies as EZ Texting's (page.name is "${named}")`
          : "the status page no longer names itself",
      };
    }
    const url = body.page?.url ?? "";
    if (url && !/(^|\/\/|\.)status\.eztexting\.com(\/|$)/i.test(url)) {
      return {
        state: "unknown",
        message: `the status page moved away from status.eztexting.com (page.url is "${url}")`,
      };
    }

    // `group: true` rows only mirror their children; CallFire's own components are not ours.
    const nodes = body.components.filter((c) =>
      c.group !== true && c.name && /ez\s?texting|sms|mms|number provisioning/i.test(c.name) &&
      !/callfire/i.test(c.name)
    );
    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      components[slug(node.name!)] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const api = body.components.find((c) =>
      c.group !== true && (c.name ?? "").trim().toLowerCase() === API_COMPONENT
    );
    if (!api) {
      return {
        state: "unknown",
        message: 'the status page no longer lists an "EZ Texting API" component, so it no longer ' +
          "speaks about the API this app calls",
        components,
        ttlSeconds: 300,
      };
    }
    components[slug(api.name!)] = {
      state: mapComponentStatus(api.status),
      message: api.name,
    };

    const others = nodes
      .filter((n) => n !== api && mapComponentStatus(n.status) !== "ok")
      .map((n) => `${n.name} (${n.status})`);
    const state = mapComponentStatus(api.status);
    const notes = [
      state === "ok" ? "the EZ Texting API component is operational" : `API (${api.status})`,
    ];
    if (others.length > 0) notes.push(`reported separately: ${others.join(", ")}`);

    return { state, message: notes.join("; "), components, ttlSeconds: 300 };
  },
};

export default service;
