/**
 * Is Paystack up?
 *
 * ## The status page is real, and it is Instatus — not Statuspage
 *
 * Checked 2026-10-06. `status.paystack.com/summary.json` is
 * `{"page":{"name":"Paystack","url":"https://status.paystack.com","status":"UP"}}` — Instatus's
 * summary shape (`page.status`, no `status.indicator`, no components), so Statuspage's
 * `status.indicator` does NOT exist here. `/components.json` carries the component list and its
 * `/api/v2/status.json` is a Next.js 404 page, so the paths are not a catch-all. Instatus spells
 * states `OPERATIONAL`, `UNDERMAINTENANCE`, `DEGRADEDPERFORMANCE`, `PARTIALOUTAGE`,
 * `MAJOROUTAGE`.
 *
 * ## There IS an API component
 *
 * Component `cmfdwyrci00e0c8j5wx3jsdde`, named `API` ("Core Paystack API used to power merchant
 * integrations and payments") in the group `Platform & Infrastructure`. It alone decides the
 * verdict. Webhooks, Refunds, Website and the per-country payment-channel components are reported
 * as detail only: a Nigerian card-processor incident (the usual kind) does not mean this API
 * is down.
 *
 * Both fetches go to `status.paystack.com`, which is the host declared below — no redirect is
 * involved.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_HOST = "status.paystack.com";
export const SUMMARY_URL = `https://${STATUS_HOST}/summary.json`;
export const COMPONENTS_URL = `https://${STATUS_HOST}/components.json`;
export const PAGE_NAME = "Paystack";
export const API_COMPONENT_ID = "cmfdwyrci00e0c8j5wx3jsdde";
export const API_COMPONENT_NAME = "API";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: { id?: string; name?: string } | null;
}

export function mapStatus(status: string | undefined): HealthState {
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

export function findApiComponent(components: StatusComponent[]): StatusComponent | undefined {
  return components.find((c) => c.id === API_COMPONENT_ID) ??
    components.find((c) => c.name === API_COMPONENT_NAME && c.group?.name !== undefined);
}

function label(c: StatusComponent): string {
  return c.group?.name ? `${c.group.name} / ${c.name}` : String(c.name);
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Paystack platform status",
  description:
    "The `API` component on status.paystack.com (Instatus). Webhooks, Refunds and the per-country " +
    "channel components are reported as detail but never drive the verdict.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const head = await ctx.fetch(SUMMARY_URL, { headers: { accept: "application/json" } });
    if (!head.ok) return { state: "unknown", message: `Status page returned ${head.status}` };
    const summary = await head.json().catch(() => null) as
      | { page?: { name?: string; status?: string } }
      | null;
    if (summary?.page?.name !== PAGE_NAME) {
      return { state: "unknown", message: "status page no longer self-identifies as Paystack's" };
    }

    const res = await ctx.fetch(COMPONENTS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };
    const body = await res.json().catch(() => null) as { components?: StatusComponent[] } | null;
    const nodes = (body?.components ?? []).filter((c) => c?.name);
    if (nodes.length === 0) return { state: "unknown", message: "Status page has no components" };

    const api = findApiComponent(nodes);
    if (!api) {
      return { state: "unknown", message: "status page no longer publishes an `API` component" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapStatus(node.status);
      components[node.id ?? label(node)] = state === "ok"
        ? { state, message: label(node) }
        : { state, message: `${label(node)}: ${node.status}` };
    }

    const state = mapStatus(api.status);
    const notes: string[] = [];
    if (state !== "ok") notes.push(`API: ${api.status}`);
    const affected = nodes.filter((n) => n !== api && mapStatus(n.status) !== "ok");
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${label(n)} (${n.status})`).join(", ")}`);
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
