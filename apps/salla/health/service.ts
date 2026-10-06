/**
 * Is Salla's Merchant API up?
 *
 * ## The status page is real — verified 2026-10-06
 *
 * `status.salla.com` is an **Instatus** page, not an Atlassian Statuspage:
 * `/api/v2/summary.json` answers 404, while `/summary.json` answers 200 with
 * `{"page":{"name":"Salla Platform","url":"https://status.salla.com","status":"UP"}}`
 * and `/components.json` lists seven top-level components (`App Store`,
 * `Merchant APIs`, `Marchant Dashboard`, `Stores Websites`, `Mahally`,
 * `Salla Website`, `Store APIs`). The host does not redirect.
 *
 * ## Which component counts
 *
 * This app calls `api.salla.dev/admin/v2` — the Merchant API — so the verdict
 * is the **`Merchant APIs`** component (id `clxu9nafz14860ben1rn6d25ig`),
 * pinned by id AND name. `Store APIs` is the storefront-facing API, a different
 * surface; it and the dashboard are not read. If the component is absent the
 * answer is `unknown`, never `ok`.
 *
 * Instatus component statuses are upper-case with no separators
 * (`OPERATIONAL`, `UNDERMAINTENANCE`, `DEGRADEDPERFORMANCE`, `PARTIALOUTAGE`,
 * `MAJOROUTAGE`) — Statuspage's `degraded_performance` never appears.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

export const STATUS_HOST = "status.salla.com";
export const STATUS_URL = `https://${STATUS_HOST}/components.json`;
export const COMPONENT_ID = "clxu9nafz14860ben1rn6d25ig";
export const COMPONENT_NAME = "Merchant APIs";

export const COMPONENT_STATE: Record<string, HealthState> = {
  OPERATIONAL: "ok",
  UNDERMAINTENANCE: "degraded",
  DEGRADEDPERFORMANCE: "degraded",
  PARTIALOUTAGE: "degraded",
  MAJOROUTAGE: "down",
};

interface InstatusComponent {
  id?: string;
  name?: string;
  status?: string;
  children?: InstatusComponent[];
}

function flatten(components: InstatusComponent[]): InstatusComponent[] {
  const out: InstatusComponent[] = [];
  for (const c of components) {
    out.push(c);
    if (c.children) out.push(...flatten(c.children));
  }
  return out;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Salla Merchant API status",
  description:
    "Status of the `Merchant APIs` component on Salla's Instatus page (status.salla.com). The storefront, dashboard and website components are unrelated to this API and are ignored.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // A broken status API says nothing about Salla itself — never `down`.
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };
    const body = await res.json().catch(() => null) as { components?: InstatusComponent[] } | null;
    if (!body || !Array.isArray(body.components)) {
      return { state: "unknown", message: "Status page returned an unreadable body" };
    }
    const api = flatten(body.components).find((c) =>
      c.id === COMPONENT_ID && c.name === COMPONENT_NAME
    );
    if (!api) {
      return { state: "unknown", message: `Status page has no \`${COMPONENT_NAME}\` component` };
    }
    const state = COMPONENT_STATE[api.status ?? ""] ?? "unknown";
    return {
      state,
      message: state === "ok" ? undefined : `${COMPONENT_NAME}: ${api.status}`,
      components: { [COMPONENT_ID]: { state, message: COMPONENT_NAME } },
      ttlSeconds: 60,
    };
  },
};

export default service;
