/**
 * Is the Clientify V1 API up?
 *
 * ## The status page is real (checked 2026-10-06)
 *
 * `status.clientify.com` is a custom-domain Better Stack page. `/index.json` answers 200
 * with Better Stack's `{"data": {"type": "status_page", "attributes": {...}}, "included":
 * [...]}` document (~43 KB), and the page self-identifies:
 *
 *     company_name "Clientify", company_url "https://clientify.com",
 *     custom_domain "status.clientify.com"
 *
 * ## Which components count
 *
 * The page covers the whole company: the web app, inbox, forms, analytics, the Homepage and
 * MCP servers as well as three API components — `API V1 Principal` (id 66651),
 * `API V1 Secundaria` (id 8762879) and `API V2`. This app calls only `/v1`, so the verdict
 * is the worst of the two `API V1 …` components. The page-level `aggregate_state` is ignored
 * on purpose: an outage of `Formularios` or `Analítica` says nothing about the REST API. The
 * other components are still listed, as detail, but never move the verdict.
 *
 * If no `API V1` component is found the check answers `unknown`, never `ok`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.clientify.com/index.json";

interface BetterStackResource {
  id?: string;
  type?: string;
  attributes?: { public_name?: string; status?: string };
}

interface BetterStackPage {
  data?: {
    attributes?: { company_name?: string; company_url?: string; custom_domain?: string };
  };
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

/** The two components that serve `/v1`: `API V1 Principal` and `API V1 Secundaria`. */
export function isV1Api(resource: BetterStackResource): boolean {
  return /^API V1\b/i.test(resource.attributes?.public_name ?? "");
}

function keyOf(resource: BetterStackResource, index: number): string {
  const name = resource.attributes?.public_name;
  if (name) return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return resource.id ?? `resource-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Clientify V1 API status",
  description: "Status of the `API V1 Principal` and `API V1 Secundaria` components on " +
    "status.clientify.com (Better Stack). Other components are shown but do not drive the verdict.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.clientify.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as BetterStackPage | null;
    const attrs = body?.data?.attributes;
    if (!attrs) {
      return { state: "unknown", message: "Status page did not return its JSON document" };
    }
    const identifies = /clientify/i.test(attrs.company_name ?? "") ||
      /clientify\.com/i.test(attrs.company_url ?? "") ||
      /clientify\.com/i.test(attrs.custom_domain ?? "");
    if (!identifies) {
      return { state: "unknown", message: "status page no longer self-identifies as Clientify's" };
    }

    const resources = (body?.included ?? []).filter((r) =>
      r.type === "status_page_resource" && r.attributes?.public_name
    );
    const v1 = resources.filter(isV1Api);
    if (v1.length === 0) {
      return { state: "unknown", message: "no `API V1` component found on the status page" };
    }

    const components: Record<string, HealthComponentReport> = {};
    resources.forEach((r, i) => {
      const state = mapResourceStatus(r.attributes?.status);
      // Detail only for non-V1 components: capped at degraded so they never read as an outage.
      const shown = isV1Api(r) || state !== "down" ? state : "degraded";
      components[keyOf(r, i)] = shown === "ok" ? { state: shown } : {
        state: shown,
        message: r.attributes?.status,
      };
    });

    const state = worstHealthState(v1.map((r) => mapResourceStatus(r.attributes?.status)));
    const affected = v1.filter((r) => mapResourceStatus(r.attributes?.status) !== "ok");
    return {
      state,
      message: affected.length
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
