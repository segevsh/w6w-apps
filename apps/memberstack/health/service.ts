/**
 * Is Memberstack up?
 *
 * ## Which status page — and the stale one next to it
 *
 * Verified 2026-10-05. Memberstack has TWO pages, and only one is live:
 *
 * - **`status.memberstack.com`** — a **Better Stack** page (its `/index.json` self-identifies:
 *   `data.attributes.company_name` `"Memberstack"`, `custom_domain` `"status.memberstack.com"`,
 *   `updated_at` the same day). Its twelve resources include a monitor named **`Admin API`**,
 *   plus `Client API`, `Dashboard API`, `Dashboard`, `SSO` and `Stripe Sync`. The host does
 *   not redirect for `/index.json` (final URL equals the requested one).
 * - `memberstack.statuspage.io` — a real Atlassian Statuspage (`page.name` "Memberstack") whose
 *   components are only `Dashboard`, `Developer API`, `memberstack.js`, with component
 *   timestamps from 2020. It is the legacy page and is not used.
 *
 * The Atlassian-shaped `/api/v2/summary.json` on the Better Stack host is a bare `301` with an
 * empty body; the real route is `/index.json`.
 *
 * ## Judged on `Admin API`, not on the page roll-up
 *
 * The page's `aggregate_state` also rolls in the marketing site, the browser SDK package and
 * four e-mail/import heartbeats — none of which this app calls. The verdict is therefore the
 * state of the **`Admin API`** resource (the host this app calls); every other resource is
 * still reported as a component but cannot turn this check `down`. If `Admin API` is missing
 * from the document the check is `unknown`, not `ok`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.memberstack.com/index.json";
export const API_RESOURCE_NAME = "Admin API";

interface BetterStackResource {
  type?: string;
  id?: string;
  attributes?: { public_name?: string; status?: string };
}

interface BetterStackPage {
  data?: { attributes?: { company_name?: string; aggregate_state?: string } };
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

export function resourceKey(resource: BetterStackResource, index: number): string {
  const name = resource.attributes?.public_name;
  if (name) return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return resource.id ?? `resource-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Memberstack platform status",
  description: "Status of the Admin API monitor on status.memberstack.com, with the other " +
    "monitors (Client API, Dashboard API, SSO, Stripe Sync, …) reported as components.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.memberstack.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "unknown", message: `could not reach the status page: ${String(err)}` };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "unknown", message: `status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as BetterStackPage | null;
    if (!body?.data?.attributes) {
      return {
        state: "unknown",
        message: "the status page did not return its JSON document — /index.json may have moved",
      };
    }
    if (!/memberstack/i.test(body.data.attributes.company_name ?? "")) {
      return {
        state: "unknown",
        message: "the status page no longer self-identifies as Memberstack's",
      };
    }

    const resources = (body.included ?? []).filter((r) =>
      r.type === "status_page_resource" && r.attributes?.public_name
    );
    if (resources.length === 0) {
      return { state: "unknown", message: "the status page listed no resources" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const [index, resource] of resources.entries()) {
      const state = mapResourceStatus(resource.attributes?.status);
      components[resourceKey(resource, index)] = state === "ok"
        ? { state, message: resource.attributes?.public_name }
        : { state, message: `${resource.attributes?.public_name}: ${resource.attributes?.status}` };
    }

    const api = resources.find((r) => r.attributes?.public_name === API_RESOURCE_NAME);
    if (!api) {
      return {
        state: "unknown",
        message: `the status page no longer lists an "${API_RESOURCE_NAME}" monitor`,
        components,
        ttlSeconds: 60,
      };
    }
    const state = mapResourceStatus(api.attributes?.status);
    return {
      state,
      message: state === "ok"
        ? `${API_RESOURCE_NAME} operational`
        : `${API_RESOURCE_NAME}: ${api.attributes?.status}`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
