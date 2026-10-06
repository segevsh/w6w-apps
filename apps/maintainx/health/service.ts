import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is MaintainX's API up? — a real **Better Stack** status page at
 * `status.getmaintainx.com`, verified 2026-10-06.
 *
 * - `GET /en/index.json` answers the Better Stack JSON:API schema
 *   (`data.attributes.company_name: "MaintainX"`, `custom_domain:
 *   "status.getmaintainx.com"`), though with `content-type: text/html`, so the
 *   body is parsed as JSON regardless of the header.
 * - The Statuspage-shaped path `/api/v2/summary.json` answers a `302` — it is
 *   not Statuspage.
 * - Resources: `MaintainX App`, `REST API`, `GraphQL API`, `Website`, in the
 *   sections Application / API / Website. The page names the API explicitly, so
 *   the verdict comes from `REST API` alone; an app-UI or marketing-site
 *   outage does not stop this integration and is reported as detail only.
 */

const STATUS_HOST = "status.getmaintainx.com";

export const STATUS_URL = `https://${STATUS_HOST}/en/index.json`;

export const VERDICT_COMPONENT = "REST API";

export const STATE: Record<string, HealthState> = {
  operational: "ok",
  degraded: "degraded",
  downtime: "down",
  maintenance: "degraded",
};

export function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface StatusPayload {
  data?: { attributes?: { company_name?: string; custom_domain?: string } };
  included?: Array<{
    type?: string;
    attributes?: { public_name?: string; status?: string; explicit_status?: string | null };
  }>;
}

export function identifiesMaintainX(
  attrs: { company_name?: string; custom_domain?: string } | undefined,
): boolean {
  const name = (attrs?.company_name ?? "").toLowerCase();
  const domain = (attrs?.custom_domain ?? "").toLowerCase();
  return name.includes("maintainx") || domain === STATUS_HOST;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "MaintainX API status",
  description:
    "Better Stack status page for status.getmaintainx.com. The verdict is the `REST API` " +
    "component; the app, GraphQL API and website components are reported as detail. Unsigned.",
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

    const body = await res.json().catch(() => null) as StatusPayload | null;
    if (!body) {
      return {
        state: "unknown",
        message: "status page did not return JSON; index.json may have moved",
      };
    }
    if (!identifiesMaintainX(body.data?.attributes)) {
      return { state: "unknown", message: "status page no longer self-identifies as MaintainX's" };
    }

    const components: Record<string, HealthComponentReport> = {};
    let verdict: HealthState | undefined;
    for (const entry of body.included ?? []) {
      if (entry.type !== "status_page_resource") continue;
      const name = entry.attributes?.public_name;
      if (!name) continue;
      // `explicit_status` is an operator override; it wins over the measured one.
      const raw = entry.attributes?.explicit_status ?? entry.attributes?.status ?? "";
      const state = STATE[raw] ?? "unknown";
      components[slug(name)] = state === "ok"
        ? { state, message: name }
        : { state, message: `${name}: ${raw || "no status"}` };
      if (name === VERDICT_COMPONENT) verdict = state;
    }

    if (Object.keys(components).length === 0) {
      return { state: "unknown", message: "status page returned no components" };
    }
    if (verdict === undefined) {
      return {
        state: "unknown",
        message: `status page has no "${VERDICT_COMPONENT}" component`,
        components,
      };
    }

    const affected = Object.values(components).filter((c) => c.state !== "ok");
    return {
      state: verdict,
      message: affected.length > 0
        ? `affected: ${affected.map((c) => c.message).join(", ")}`
        : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
