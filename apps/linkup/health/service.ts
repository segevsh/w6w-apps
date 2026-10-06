/**
 * Is Linkup up?
 *
 * ## The status page is real (checked 2026-10-06)
 *
 * `status.linkup.so` is an OpenStatus page (feed generator `OpenStatus - Status Page Updates`).
 * It is NOT a catch-all: unknown paths answer a real 404. It publishes RSS and Atom feeds, but
 * those carry only maintenance announcements (three, all in the past, with no resolved marker),
 * so they cannot say whether anything is down right now. `GET /feed/json` can:
 *
 *     {"title":"Linkup","status":"success",
 *      "monitors":[{"id":8640,"name":"Search API","status":"success"},
 *                  {"name":"Application",…},{"name":"MCP Server",…},{"name":"Fetch API",…}],
 *      "maintenances":[…],"statusReports":[]}
 *
 * ## Which monitors count
 *
 * This app calls the Search API and the Fetch API, so those two drive the verdict. `Application`
 * (the dashboard) and `MCP Server` are listed as detail, capped at `degraded`. Monitor status
 * `success` is operational; `degraded` is degraded; `error` is down; anything else (including
 * `info`, which OpenStatus uses for maintenance) is read as degraded, and a page that no longer
 * names the two API monitors is `unknown`, never `ok`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { STATUS_HOST } from "../lib/client.ts";

export const STATUS_URL = `https://${STATUS_HOST}/feed/json`;
export const DRIVING = ["Search API", "Fetch API"];

interface Monitor {
  id?: number;
  name?: string;
  status?: string;
}

interface Page {
  title?: string;
  monitors?: Monitor[];
}

export function mapMonitorStatus(status: string | undefined): HealthState {
  switch (status) {
    case "success":
      return "ok";
    case "error":
      return "down";
    case "degraded":
    case "info":
      return "degraded";
    default:
      return "unknown";
  }
}

const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

const service: HealthCheckDefinition = {
  key: "service",
  title: "Linkup API status",
  description: "The Search API and Fetch API monitors on status.linkup.so (OpenStatus). The " +
    "dashboard and MCP server monitors are shown but do not drive the verdict.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };
    const body = await res.json().catch(() => null) as Page | null;
    if (!body || !Array.isArray(body.monitors)) {
      return { state: "unknown", message: "Status page did not return its JSON document" };
    }
    if (!/linkup/i.test(body.title ?? "")) {
      return { state: "unknown", message: "status page no longer self-identifies as Linkup's" };
    }

    const driving = DRIVING.map((n) => body.monitors!.find((m) => m.name === n));
    if (driving.some((m) => !m)) {
      return { state: "unknown", message: "status page no longer names the Search and Fetch API" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const m of body.monitors) {
      const state = mapMonitorStatus(m.status);
      const shown = DRIVING.includes(m.name ?? "") || state !== "down" ? state : "degraded";
      const key = (m.name ?? String(m.id)).toLowerCase().replace(/[^a-z0-9]+/g, "-");
      components[key] = shown === "ok" ? { state: shown } : { state: shown, message: m.status };
    }

    const states = driving.map((m) => mapMonitorStatus(m!.status));
    const state = states.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), "ok" as HealthState);
    const bad = driving.filter((m) => mapMonitorStatus(m!.status) !== "ok");
    return {
      state,
      message: state === "ok"
        ? "Search API and Fetch API operational"
        : bad.map((m) => `${m!.name} (${m!.status})`).join("; "),
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
