/**
 * Is Brandfetch up?
 *
 * ## The status page is real (checked 2026-10-06)
 *
 * `status.brandfetch.io` is a Better Stack page. The Statuspage paths
 * (`/api/v2/summary.json`, `/history.atom`) return the HTML shell with a 200, so
 * they prove nothing; `/index.json` answers Better Stack's JSON:API document, and
 * the page self-identifies:
 *
 *     id "143651", company_name "Brandfetch", custom_domain "status.brandfetch.io"
 *
 * ## Which resources count
 *
 * One section, "Current status by service", with `Brand API`, `Brand Context
 * API`, `Search API`, `Logo Link CDN`, `Assets CDN`, the website, the developer
 * dashboard and the docs. This app calls the first three, so those decide the
 * verdict (worst of them). The rest are shown as detail, capped at `degraded`:
 * a dashboard outage does not stop an API call. If the page no longer names the
 * Brand API resource the answer is `unknown`, never `ok`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_HOST = "status.brandfetch.io";
export const STATUS_URL = `https://${STATUS_HOST}/index.json`;
export const PAGE_ID = "143651";
/** Resources this app's actions call. */
export const WATCHED = ["Brand API", "Brand Context API", "Search API"];

interface BetterStackResource {
  id?: string;
  type?: string;
  attributes?: { public_name?: string; status?: string };
}

interface BetterStackPage {
  data?: { id?: string; attributes?: { company_name?: string; custom_domain?: string } };
  included?: BetterStackResource[];
}

export function mapResourceStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
    case "resolved":
      return "ok";
    case "degraded":
    case "maintenance":
      return "degraded";
    case "downtime":
    case "down":
      return "down";
    default:
      return "unknown";
  }
}

const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

function keyOf(resource: BetterStackResource, index: number): string {
  const name = resource.attributes?.public_name;
  if (name) return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return resource.id ?? `resource-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Brandfetch status",
  description: "Status of the Brand API, Brand Context API and Search API on " +
    "status.brandfetch.io (Better Stack). Other resources are shown but do not drive the verdict.",
  kind: "service",
  covers: ["*"],
  scope: "connection",
  credential: "none",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as BetterStackPage | null;
    const attrs = body?.data?.attributes;
    if (!attrs) {
      return { state: "unknown", message: "Status page did not return its JSON document" };
    }
    if (body?.data?.id !== PAGE_ID || !/brandfetch/i.test(attrs.company_name ?? "")) {
      return { state: "unknown", message: "status page no longer self-identifies as Brandfetch's" };
    }

    const resources = (body?.included ?? []).filter((r) =>
      r.type === "status_page_resource" && r.attributes?.public_name
    );
    const watched = resources.filter((r) => WATCHED.includes(r.attributes!.public_name!));
    if (!watched.some((r) => r.attributes?.public_name === "Brand API")) {
      return { state: "unknown", message: 'status page names no "Brand API" resource' };
    }

    const components: Record<string, HealthComponentReport> = {};
    resources.forEach((r, i) => {
      const state = mapResourceStatus(r.attributes?.status);
      const shown = watched.includes(r) || state !== "down" ? state : "degraded";
      components[keyOf(r, i)] = shown === "ok"
        ? { state: shown }
        : { state: shown, message: r.attributes?.status };
    });

    const worst = watched.reduce<HealthState>((acc, r) => {
      const s = mapResourceStatus(r.attributes?.status);
      return RANK[s] > RANK[acc] ? s : acc;
    }, "ok");
    const bad = watched.filter((r) => mapResourceStatus(r.attributes?.status) !== "ok");
    return {
      state: worst,
      message: bad.length === 0
        ? "Brand, Brand Context and Search APIs operational"
        : bad.map((r) => `${r.attributes?.public_name} (${r.attributes?.status})`).join("; "),
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
