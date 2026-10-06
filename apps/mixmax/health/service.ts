/**
 * Is Mixmax's API up, per its own status page?
 *
 * ## The status page, verified live on 2026-10-06
 *
 * `status.mixmax.com` is an **Instatus** page (not Atlassian Statuspage). `/summary.json` answers
 * `{"page":{"name":"Mixmax","url":"https://status.mixmax.com","status":"UP"}}` and
 * `/components.json` answers the component tree; `/index.json` is a Next.js 404 and
 * `/api/v2/summary.json` is the same minimal alias of `/summary.json`.
 *
 * ## Why the verdict comes from components, not the page status
 *
 * The page status rolls up the whole product (Gmail sidebar, Chrome extension, dialer, SMS,
 * Salesforce sync, ...). A workflow calling the REST API should not read "down" because the
 * sidebar is. The page has components named `API` and `Public API` (under "Developer Features"),
 * so the verdict is the worst of those two; the page-level status is quoted in the message only.
 * If neither is found the check reports `unknown`, never a guess.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_HOST = "status.mixmax.com";
export const SUMMARY_URL = `https://${STATUS_HOST}/summary.json`;
export const COMPONENTS_URL = `https://${STATUS_HOST}/components.json`;

/** Names of the components that describe the REST API. */
const API_COMPONENTS = new Set(["API", "Public API"]);

interface ComponentNode {
  id?: string;
  name?: string;
  status?: string;
  children?: ComponentNode[];
}

/** Instatus component status; anything unseen is `unknown`. */
export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "OPERATIONAL":
      return "ok";
    case "UNDERMAINTENANCE":
    case "DEGRADEDPERFORMANCE":
    case "PARTIALOUTAGE":
      return "degraded";
    case "MAJOROUTAGE":
      return "down";
    default:
      return "unknown";
  }
}

const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

function flatten(nodes: ComponentNode[]): ComponentNode[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children ?? [])]);
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Mixmax API status",
  description:
    "Status of the `API` and `Public API` components on status.mixmax.com (Instatus); the page-wide status covers the whole product and is only quoted.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const sum = await ctx.fetch(SUMMARY_URL, { headers: { accept: "application/json" } });
    if (!sum.ok) return { state: "unknown", message: `Status page returned ${sum.status}` };
    const summary = await sum.json().catch(() => null) as
      | { page?: { name?: string; status?: string } }
      | null;
    if (!summary?.page) {
      return { state: "unknown", message: "Status page returned an unreadable body" };
    }
    if (summary.page.name && summary.page.name !== "Mixmax") {
      return { state: "unknown", message: "status page no longer self-identifies as Mixmax's" };
    }

    const comp = await ctx.fetch(COMPONENTS_URL, { headers: { accept: "application/json" } });
    if (!comp.ok) return { state: "unknown", message: `Components feed returned ${comp.status}` };
    const body = await comp.json().catch(() => null) as { components?: ComponentNode[] } | null;
    const api = flatten(body?.components ?? []).filter(
      (c) => c.id && c.name && API_COMPONENTS.has(c.name),
    );
    if (api.length === 0) {
      return { state: "unknown", message: "no API component found on the status page" };
    }

    const components: Record<string, HealthComponentReport> = {};
    let state: HealthState = "ok";
    for (const c of api) {
      const s = mapComponentStatus(c.status);
      components[c.id!] = s === "ok"
        ? { state: s, message: c.name }
        : { state: s, message: `${c.name}: ${c.status}` };
      if (RANK[s] > RANK[state]) state = s;
    }
    return {
      state,
      message: state === "ok"
        ? `API components operational (page status: ${summary.page.status ?? "n/a"})`
        : `API components affected (page status: ${summary.page.status ?? "n/a"})`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
