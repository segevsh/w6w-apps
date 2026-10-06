/**
 * Is Supadata up?
 *
 * ## The status page is real (checked 2026-10-06)
 *
 * `status.supadata.ai` is a custom-domain Better Stack page. The Statuspage paths
 * (`/api/v2/summary.json`, `/summary.json`, `/history.atom`) all answer the same HTML shell;
 * `/index.json` answers 200 with Better Stack's `{"data": {"type": "status_page", …}, "included":
 * […]}` document, and the page self-identifies as id `204857`, `company_name` "Supadata". It has
 * one section ("API") with two resources: `Transcript API` and `Dashboard`.
 *
 * ## Which resource counts
 *
 * The verdict is `Transcript API` — the resource that covers `api.supadata.ai` (the vendor's one
 * API product; scrape, metadata and YouTube routes are served from the same host). `Dashboard` is
 * shown as detail, capped at `degraded`: a dashboard outage does not stop API calls. If the page no
 * longer names the resource the answer is `unknown`, never `ok`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_HOST = "status.supadata.ai";
export const STATUS_URL = `https://${STATUS_HOST}/index.json`;
export const PAGE_ID = "204857";
export const API_RESOURCE = "Transcript API";

interface BetterStackResource {
  id?: string;
  type?: string;
  attributes?: { public_name?: string; status?: string };
}

interface BetterStackPage {
  data?: { id?: string; attributes?: { company_name?: string } };
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

const service: HealthCheckDefinition = {
  key: "service",
  title: "Supadata status",
  description:
    "The `Transcript API` resource on status.supadata.ai (Better Stack). The dashboard " +
    "resource is shown but does not drive the verdict.",
  kind: "service",
  covers: ["*"],
  scope: "connection",
  credential: "context",
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
    if (body?.data?.id !== PAGE_ID || !/supadata/i.test(attrs.company_name ?? "")) {
      return { state: "unknown", message: "status page no longer self-identifies as Supadata's" };
    }

    const resources = (body?.included ?? []).filter((r) =>
      r.type === "status_page_resource" && r.attributes?.public_name
    );
    const mine = resources.find((r) => r.attributes?.public_name === API_RESOURCE);
    if (!mine) {
      return { state: "unknown", message: `status page names no "${API_RESOURCE}" resource` };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const r of resources) {
      const state = mapResourceStatus(r.attributes?.status);
      const shown = r === mine || state !== "down" ? state : "degraded";
      const key = r.attributes!.public_name!.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      components[key] = shown === "ok" ? { state: shown } : {
        state: shown,
        message: r.attributes?.status,
      };
    }

    const state = mapResourceStatus(mine.attributes?.status);
    return {
      state,
      message: state === "ok"
        ? `${API_RESOURCE} operational`
        : `${API_RESOURCE} (${mine.attributes?.status})`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
