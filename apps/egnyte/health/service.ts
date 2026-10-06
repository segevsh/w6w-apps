/**
 * Is Egnyte's Public API up?
 *
 * `status.egnyte.com` is an Atlassian Statuspage (`/api/v2/summary.json`, 200
 * `application/json`, page `{"name":"Egnyte Platform"}`; checked 2026-10-06).
 * It covers the whole product (Web UI, Sync, Mobile, AI Services, ...), so the
 * page-level `status.indicator` is NOT the verdict for an API integration —
 * Egnyte's Desktop App having a bad day should not mark the API down.
 *
 * The page carries TWO components both named "Public APIs and Integrations"
 * (ids below, in different groups — a newer and a legacy one). Both are
 * reported and the verdict is the worst of them. They are pinned by id because
 * the name is not unique.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.egnyte.com/api/v2/summary.json";
export const API_COMPONENT_IDS = ["7sflj4wg0f37", "6zffx85n8z6n"];

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
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

const service: HealthCheckDefinition = {
  key: "service",
  title: "Egnyte Public API status",
  description:
    "The 'Public APIs and Integrations' components on status.egnyte.com. The rest of the platform (web UI, sync, AI services) is deliberately not part of the verdict.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.egnyte.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.egnyte\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Egnyte's" };
    }

    const api = (body.components ?? []).filter((c) => c.id && API_COMPONENT_IDS.includes(c.id));
    if (api.length === 0) {
      return { state: "unknown", message: "Status page no longer lists the Public API component" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const c of api) {
      const state = mapComponentStatus(c.status);
      components[c.id!] = state === "ok"
        ? { state, message: c.name }
        : { state, message: `${c.name}: ${c.status}` };
    }
    const state = worstHealthState(Object.values(components).map((c) => c.state));
    return {
      state,
      message: state === "ok" ? undefined : "Egnyte reports a Public API incident",
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
