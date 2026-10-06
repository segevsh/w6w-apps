import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.alegra.com/index.json";

/** The resource that covers `api.alegra.com`, pinned by id (name checked as a fallback). */
export const API_RESOURCE_ID = "1608669";
export const API_RESOURCE_NAME = "API Alegra Contabilidad";

interface Resource {
  id?: string;
  type?: string;
  attributes?: { public_name?: string; explanation?: string; status?: string };
}

interface Page {
  data?: { attributes?: { company_name?: string; custom_domain?: string } };
  included?: Resource[];
}

export function mapStatus(status: string | undefined): HealthState {
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
  title: "Alegra API status",
  description:
    "The `API Alegra Contabilidad` resource on status.alegra.com (Better Stack) decides " +
    "the verdict. The page also lists the web app, POS, Payroll and Store; those are shown as " +
    "detail but do not drive the state, because they are different products.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.alegra.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as Page | null;
    const attrs = body?.data?.attributes;
    if (!attrs) {
      return { state: "unknown", message: "Status page did not return its JSON document" };
    }
    if (
      !/alegra/i.test(attrs.company_name ?? "") && !/alegra\.com/i.test(attrs.custom_domain ?? "")
    ) {
      return { state: "unknown", message: "status page no longer self-identifies as Alegra's" };
    }

    const resources = (body?.included ?? []).filter((r) =>
      r.type === "status_page_resource" && r.attributes?.public_name
    );
    const api = resources.find((r) => r.id === API_RESOURCE_ID) ??
      resources.find((r) => r.attributes?.public_name === API_RESOURCE_NAME);
    if (!api) {
      return {
        state: "unknown",
        message: `status page no longer lists the "${API_RESOURCE_NAME}" resource`,
      };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const r of resources) {
      const name = r.attributes!.public_name!;
      const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const state = mapStatus(r.attributes?.status);
      components[key] = state === "ok" ? { state } : { state, message: r.attributes?.status };
    }

    const state = mapStatus(api.attributes?.status);
    return {
      state,
      message: state === "ok" ? undefined : `${API_RESOURCE_NAME}: ${api.attributes?.status}`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
