/**
 * Is Qdrant Cloud up? — and the harder question this check has to be honest
 * about: up *where*, and does that have anything to do with your instance.
 *
 * ## The page, and the trap next to it
 *
 * `status.qdrant.io` is a **Better Stack** status page — not an Atlassian
 * Statuspage, which is the guess the rest of this pack trains you to make.
 * Probed live on 2026-08-18:
 *
 *   | Path                            | Status | Bytes   | Body                      |
 *   | ------------------------------- | ------ | ------- | ------------------------- |
 *   | `/index.json`                   | 200    | 108,811 | **JSON**, self-describing |
 *   | `/api/v2/summary.json`          | 200    | 983,546 | the catch-all HTML        |
 *   | `/status.json`                  | 200    | 983,546 | the catch-all HTML        |
 *   | `/definitely-not-real-zzz.json` | 200    | 983,546 | the catch-all HTML        |
 *
 * Every Statuspage-shaped path answers `200` with the page's own HTML, so
 * "a bogus sibling is refused" cannot be the discriminator here. What separates
 * the real route is that it returns a **different, smaller JSON** naming the
 * company. The check enforces exactly that, so the day `/index.json` goes away
 * this reports `unknown` rather than parsing a web page forever.
 *
 * ## What the page actually covers, in two sections
 *
 * - **Current status by service** — Website / Documentation, Cloud UI,
 *   Cloud API (extern). This is the **control plane**: the console and the
 *   provisioning API. A cluster keeps serving queries while all three are down.
 * - **Cloud Qdrant Database Clusters** — one resource per region
 *   (`AWS us-east-1`, `GCP europe-west3`, `Azure uksouth`, …) plus
 *   `Hybrid Cloud`. *These* are the ones a query depends on.
 *
 * ## Why this check can almost never say `down`
 *
 * Two reasons, and both are about what an **app-scoped** check can know:
 *
 *  1. **It does not know which region.** A connection is a URL; the region is
 *     in the hostname but this hook has no connection. One region's outage is
 *     total for the tenants in it and irrelevant to everyone else, so reporting
 *     it as `down` for the whole app would be wrong far more often than right.
 *     `apps/pinecone` makes the same call for the same reason.
 *  2. **Qdrant is self-hostable, and most instances are.** For a connection
 *     pointing at a container in somebody's VPC, every resource on this page is
 *     irrelevant — and this hook cannot tell those connections apart from cloud
 *     ones either.
 *
 * So regional and control-plane trouble is reported and **capped at
 * `degraded`**, and the severity is `informational`: real, worth displaying,
 * and not evidence about any particular connection. The one exception is a
 * genuine global outage — *every* cluster region down at once — which is not a
 * "which region are you in" question any more.
 *
 * What carries the weight for a specific connection is `instance` and
 * `collections`, which probe that instance directly.
 *
 * ## Posture
 *
 * `credential: "none"`, and load-bearing: a third-party status host must never
 * see the instance's API key. `network.allow` names this one host for this hook
 * alone — redundant while the app's own allowlist ends in `*` (see
 * `lib/client.ts` for why it has to), written out so the intent survives if that
 * is ever narrowed.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.qdrant.io/index.json";

/** The section holding the per-region cluster resources. */
export const CLUSTER_SECTION = /cluster/i;

interface BetterStackResource {
  id?: string;
  type?: string;
  attributes?: {
    status_page_section_id?: number;
    public_name?: string;
    status?: string;
  };
}

interface BetterStackSection {
  id?: string;
  type?: string;
  attributes?: { name?: string };
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
  included?: Array<BetterStackResource & BetterStackSection>;
}

/**
 * Better Stack's resource vocabulary: `operational`, `degraded`, `downtime`,
 * `maintenance`, plus `unknown` for a resource with no recent data.
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

/** Slugify a resource's public name into a stable component key. */
export function resourceKey(resource: BetterStackResource, index: number): string {
  const name = resource.attributes?.public_name;
  if (name) return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return resource.id ?? `resource-${index}`;
}

/** `down` only survives when every region is down; otherwise cap at `degraded`. */
export function capState(state: HealthState): HealthState {
  return state === "down" ? "degraded" : state;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Qdrant Cloud status",
  description:
    "Resource status from status.qdrant.io (Better Stack). Covers Qdrant CLOUD — the console, " +
    "the provisioning API, and the cluster regions. It cannot know which region a connection is " +
    "in, or whether it is self-hosted, so it is informational and capped at degraded.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: ["status.qdrant.io"] },
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
      // A broken status page says nothing about Qdrant — never `down`.
      return { state: "unknown", message: `status page returned ${res.status}` };
    }

    // This page serves its HTML for unknown paths WITH a 200, so a parse failure
    // is the expected signal that the JSON route has gone away, not an anomaly.
    const body = await res.json().catch(() => null) as BetterStackPage | null;
    if (!body?.data?.attributes) {
      return {
        state: "unknown",
        message: "status page did not return its JSON document — the /index.json route may be gone",
      };
    }

    // A rebrand or a redirect pointing this probe at somebody else's healthy
    // status page would otherwise read as good news.
    const attrs = body.data.attributes;
    const identifies = /qdrant/i.test(attrs.company_name ?? "") ||
      /qdrant\./i.test(attrs.company_url ?? "") ||
      /qdrant\./i.test(attrs.custom_domain ?? "");
    if (!identifies) {
      return { state: "unknown", message: "status page no longer self-identifies as Qdrant's" };
    }

    const included = body.included ?? [];
    const sectionNames = new Map<string, string>();
    for (const entry of included) {
      if (entry.type === "status_page_section" && entry.id) {
        sectionNames.set(String(entry.id), entry.attributes?.name ?? "");
      }
    }

    const resources = included.filter((r) =>
      r.type === "status_page_resource" && r.attributes?.public_name
    );
    if (resources.length === 0) {
      return { state: "unknown", message: "status page listed no resources" };
    }

    const components: Record<string, HealthComponentReport> = {};
    const clusters: HealthState[] = [];
    for (const [index, resource] of resources.entries()) {
      const state = mapResourceStatus(resource.attributes?.status);
      components[resourceKey(resource, index)] = state === "ok"
        ? { state }
        : { state, message: resource.attributes?.status };
      const section = sectionNames.get(String(resource.attributes?.status_page_section_id ?? ""));
      if (CLUSTER_SECTION.test(section ?? "")) clusters.push(state);
    }

    const worst = worstHealthState(Object.values(components).map((c) => c.state));
    // Every region at once is no longer a "which region are you in" question.
    const globalOutage = clusters.length > 0 && clusters.every((s) => s === "down");
    const state = globalOutage ? "down" : capState(worst);

    const affected = resources.filter((r) => mapResourceStatus(r.attributes?.status) !== "ok");
    const notes: string[] = [];
    if (globalOutage) notes.push("every cluster region is down");
    if (affected.length > 0) {
      notes.push(
        `affected: ${
          affected.map((r) => `${r.attributes?.public_name} (${r.attributes?.status})`).join(", ")
        }`,
      );
    } else if (attrs.aggregate_state) {
      notes.push(`aggregate: ${attrs.aggregate_state}`);
    }
    if (!globalOutage && worst === "down") {
      notes.push("capped at degraded — this check cannot know which region a connection uses");
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
