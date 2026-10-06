/**
 * Is Superchat up?
 *
 * `status.superchat.de` is a real **Better Stack** page (title "Better Stack"),
 * checked 2026-10-06: `/index.json` answers 200 with Better Stack's own JSON
 * (`data.attributes.company_name` is "SuperX GmbH", Superchat's legal entity,
 * `company_url` https://superchat.de) and six resources of Superchat's own —
 * WebApp, Review Seite, Webchat, API, Worker, Webhook Infrastructure. The
 * Statuspage-shaped paths (`/api/v2/summary.json`) all 301 to `/`, so they are
 * decoys. The page's company name is NOT "Superchat", which is why the identity
 * guard below accepts the legal-entity name as well.
 *
 * The page-level `aggregate_state` decides the verdict; each resource is
 * reported as a component. `credential: "none"` so a status host never sees a
 * Superchat API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.superchat.de/index.json";

interface BetterStackResource {
  id?: string;
  type?: string;
  attributes?: {
    public_name?: string;
    explanation?: string;
    status?: string;
    availability?: number;
  };
}

interface BetterStackPage {
  data?: {
    type?: string;
    attributes?: {
      company_name?: string;
      company_url?: string;
      custom_domain?: string;
      aggregate_state?: string;
    };
  };
  included?: BetterStackResource[];
}

/**
 * Better Stack's resource vocabulary, matching `apps/baserow`'s own reading
 * of the same platform: `operational`, `degraded`, `downtime`, `maintenance`,
 * plus `unknown` for anything else (including a resource with no recent
 * data).
 */
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

/** The page-level roll-up, `data.attributes.aggregate_state`. */
export function mapAggregateState(state: string | undefined): HealthState {
  switch (state) {
    case "operational":
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

/** Slugify a resource's public name into a stable component key. */
export function resourceKey(resource: BetterStackResource, index: number): string {
  const name = resource.attributes?.public_name;
  if (name) return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return resource.id ?? `resource-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Superchat platform status",
  description:
    "Resource status from status.superchat.de (Better Stack): WebApp, API, Webchat, Worker, " +
    "Webhook Infrastructure and the review page.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.superchat.de"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status page says nothing about Superchat — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as BetterStackPage | null;
    if (!body?.data?.attributes) {
      return {
        state: "unknown",
        message: "Status page did not return its JSON document — the /index.json route may be gone",
      };
    }

    // Guard against a future redirect or rebrand silently pointing this probe
    // at somebody else's page — a healthy, claimed page belonging to an
    // entirely different product would otherwise read as good news.
    const attrs = body.data.attributes;
    const identifies = /superx|superchat/i.test(attrs.company_name ?? "") ||
      /superchat\.(de|com)/i.test(attrs.company_url ?? "") ||
      /superchat\.(de|com)/i.test(attrs.custom_domain ?? "");
    if (!identifies) {
      return { state: "unknown", message: "status page no longer self-identifies as Superchat's" };
    }

    const resources = (body.included ?? []).filter((r) =>
      r.type === "status_page_resource" && r.attributes?.public_name
    );

    const components: Record<string, HealthComponentReport> = {};
    resources.forEach((resource, index) => {
      const state = mapResourceStatus(resource.attributes?.status);
      components[resourceKey(resource, index)] = state === "ok"
        ? { state }
        : { state, message: resource.attributes?.status };
    });

    const aggregate = attrs.aggregate_state;
    const state = aggregate === undefined
      ? worstHealthState(Object.values(components).map((c) => c.state))
      : mapAggregateState(aggregate);

    const affected = resources.filter((r) => mapResourceStatus(r.attributes?.status) !== "ok");
    const notes: string[] = [];
    if (aggregate) notes.push(`aggregate: ${aggregate}`);
    if (affected.length > 0) {
      notes.push(
        `affected: ${
          affected.map((r) => `${r.attributes?.public_name} (${r.attributes?.status})`).join(", ")
        }`,
      );
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components: Object.keys(components).length > 0 ? components : undefined,
      ttlSeconds: 60,
    };
  },
};

export default service;
