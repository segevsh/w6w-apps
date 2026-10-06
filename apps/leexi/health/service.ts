/**
 * Vendor status — status.leexi.ai, a custom-domain **Better Stack** page.
 *
 * Verified real on 2026-10-06: its `<title>` is "Better Stack", `/index.json` answers
 * Better Stack's own JSON:API document with `company_name` "Leexi", page id `194848`
 * and `custom_domain` "status.leexi.ai". The Statuspage-shaped paths
 * (`/api/v2/summary.json`, `/summary.json`, `/history.rss`) are a catch-all that answers
 * the same ~194 KB HTML page with 200, so they prove nothing; `leexi.statuspage.io`
 * redirects to Atlassian's marketing page (unclaimed decoy).
 *
 * The page lists two resources — `leexi.ai` (the web app, id 8460282) and `api.leexi.ai`
 * (the API, id 8460283). Only the API resource decides this app's verdict; the web app is
 * shown as detail but capped at `degraded`, since the dashboard being down does not make
 * the API down.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

const STATUS_HOST = "status.leexi.ai";
export const STATUS_URL = `https://${STATUS_HOST}/index.json`;
export const PAGE_ID = "194848";
export const API_RESOURCE_ID = "8460283";

interface BetterStackResource {
  id?: string;
  type?: string;
  attributes?: { public_name?: string; status?: string };
}

interface BetterStackPage {
  data?: { id?: string; attributes?: { company_name?: string; custom_domain?: string } };
  included?: BetterStackResource[];
}

/** Better Stack's vocabulary: operational, degraded, downtime, maintenance. */
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
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "Leexi platform status",
  description:
    "status.leexi.ai (Better Stack). The `api.leexi.ai` resource decides; the `leexi.ai` web app is capped at degraded.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // `unknown`, never `down`: a failing status page says nothing about the vendor.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as BetterStackPage | null;
    if (!body?.data?.attributes) {
      return {
        state: "unknown",
        message: "status page did not return its JSON document — the /index.json route may be gone",
      };
    }
    if (body.data.id !== PAGE_ID || !/leexi/i.test(body.data.attributes.company_name ?? "")) {
      return {
        state: "unknown",
        message:
          `status page is not Leexi's (id ${body.data.id}, name "${body.data.attributes.company_name}")`,
      };
    }

    const resources = (body.included ?? []).filter((r) =>
      r.type === "status_page_resource" && r.attributes?.public_name
    );
    const api = resources.find((r) =>
      r.id === API_RESOURCE_ID || r.attributes?.public_name === "api.leexi.ai"
    );
    if (!api) return { state: "unknown", message: "status page lists no `api.leexi.ai` resource" };

    const components: Record<string, HealthComponentReport> = {};
    for (const r of resources) {
      const state = mapResourceStatus(r.attributes?.status);
      components[slug(r.attributes!.public_name!)] = state === "ok"
        ? { state }
        : { state, message: `${r.attributes?.public_name}: ${r.attributes?.status}` };
    }

    let state = mapResourceStatus(api.attributes?.status);
    for (const r of resources) {
      if (r === api) continue;
      const s = mapResourceStatus(r.attributes?.status);
      const capped: HealthState = s === "down" ? "degraded" : s;
      if (RANK[capped] > RANK[state]) state = capped;
    }

    const affected = resources.filter((r) => mapResourceStatus(r.attributes?.status) !== "ok");
    return {
      state,
      message: affected.length > 0
        ? `affected: ${
          affected.map((r) => `${r.attributes?.public_name} (${r.attributes?.status})`).join(", ")
        }`
        : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
