/**
 * Is Dropcontact up?
 *
 * ## The status page is real (checked 2026-10-06)
 *
 * `status.dropcontact.com` is an Atlassian Statuspage: `/api/v2/summary.json` answers JSON,
 * the page self-identifies as `{"id":"x803htx24trw","name":"Dropcontact"}`, and its five
 * components are Dropcontact's own: `Dropcontact.com`, `Dropcontact APP`, `Dropcontact FILE`,
 * `Dropcontact API`, `Dropcontact CRM`.
 *
 * ## Which component counts
 *
 * This app only calls the REST API, so the `Dropcontact API` component (id `hdj96nlnshmj`)
 * decides the verdict. The other four are reported as detail, capped at `degraded`: a web-app
 * or CRM-connector outage does not stop an API call. If the page no longer names the API
 * component the answer is `unknown`, never `ok`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_HOST = "status.dropcontact.com";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;
export const PAGE_ID = "x803htx24trw";
export const API_COMPONENT_ID = "hdj96nlnshmj";
export const API_COMPONENT_NAME = "Dropcontact API";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string };
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
  title: "Dropcontact status",
  description: "Status of the `Dropcontact API` component on status.dropcontact.com " +
    "(Statuspage). The web app, file, CRM and website components are shown but do not drive " +
    "the verdict.",
  kind: "service",
  covers: ["*"],
  scope: "app",
  credential: "none",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body?.page) {
      return { state: "unknown", message: "Status page did not return its JSON document" };
    }
    if (body.page.id !== PAGE_ID || !/dropcontact/i.test(body.page.name ?? "")) {
      return {
        state: "unknown",
        message: "status page no longer self-identifies as Dropcontact's",
      };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    const apiNode = nodes.find((c) => c.id === API_COMPONENT_ID) ??
      nodes.find((c) => c.name === API_COMPONENT_NAME);
    if (!apiNode) {
      return {
        state: "unknown",
        message: `status page names no "${API_COMPONENT_NAME}" component`,
      };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((n, i) => {
      const state = mapComponentStatus(n.status);
      const shown = n === apiNode || state !== "down" ? state : "degraded";
      components[n.id ?? `component-${i}`] = shown === "ok"
        ? { state: shown, message: n.name }
        : { state: shown, message: `${n.name}: ${n.status}` };
    });

    const state = mapComponentStatus(apiNode.status);
    return {
      state,
      message: state === "ok" ? undefined : `${apiNode.name}: ${apiNode.status}`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
