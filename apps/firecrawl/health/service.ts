/**
 * Is Firecrawl up?
 *
 * `status.firecrawl.dev` is a **Better Stack** status page — confirmed the
 * same way `apollo`'s check confirms its own Better Stack page, on
 * 2026-09-15:
 *
 * 1. Every Atlassian-Statuspage-shaped path (`/api/v2/summary.json`,
 *    `/api/v2/<bogus>.json`) answers **301** to `/`, so this is not
 *    Statuspage.
 * 2. `GET /index.json` (sent with `Accept: application/json`) answers `200`
 *    with `content-type: application/json`, Better Stack's own JSON:API
 *    shape, and self-identifies:
 *    `"company_name": "Firecrawl", "company_url": "https://firecrawl.dev",
 *    "custom_domain": "status.firecrawl.dev"`.
 * 3. A bogus sibling path (`/index-not-real.json`) answers **301**, not a
 *    decoy 200 — distinguishing a real document from a catch-all.
 *
 * Two monitors are published, and both are directly relevant (unlike
 * Apollo's page, where none named the REST API): **`api.firecrawl.dev`** —
 * the API surface every action here calls — and **`firecrawl.dev`**, the
 * marketing site. Both are reported; if a future monitor is added it is
 * simply ignored rather than failing the check (see the `RELEVANT_MONITORS`
 * filter).
 *
 * `credential: "none"` (the default for `kind: "service"`) is stated
 * explicitly: a status host must never see a Firecrawl API key, which is why
 * this host lives only in this check's own `network`, never in the app's
 * `w6w.network.allow`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.firecrawl.dev/index.json";

/** The two monitors this page publishes, both relevant to this app. */
export const RELEVANT_MONITORS = new Set(["api.firecrawl.dev", "firecrawl.dev"]);

interface BetterStackResource {
  type?: string;
  attributes?: {
    public_name?: string;
    status?: string;
  };
}

interface BetterStackPage {
  data?: {
    attributes?: {
      company_name?: string;
      company_url?: string;
      custom_domain?: string;
      aggregate_state?: string;
    };
  };
  included?: BetterStackResource[];
}

/** Better Stack's documented status-page resource vocabulary. */
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

/** Slugify a monitor's public name into a stable component key. */
export function componentKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Firecrawl platform status",
  description: "Monitor status from status.firecrawl.dev (Better Stack): api.firecrawl.dev and " +
    "firecrawl.dev, reported separately.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.firecrawl.dev"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Firecrawl itself — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as BetterStackPage | null;
    const attrs = body?.data?.attributes;
    if (!attrs) {
      return {
        state: "unknown",
        message: "Status page did not return its JSON document — /index.json may be gone",
      };
    }

    const identifies = /firecrawl/i.test(attrs.company_name ?? "") ||
      /firecrawl\.dev/i.test(attrs.company_url ?? "") ||
      /firecrawl\.dev/i.test(attrs.custom_domain ?? "");
    if (!identifies) {
      return { state: "unknown", message: "status page no longer self-identifies as Firecrawl's" };
    }

    const monitors = (body?.included ?? [])
      .filter((r) =>
        r.type === "status_page_resource" && r.attributes?.public_name &&
        RELEVANT_MONITORS.has(r.attributes.public_name)
      );
    if (monitors.length === 0) {
      return { state: "unknown", message: "Status page returned none of the monitored resources" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const m of monitors) {
      const name = m.attributes!.public_name!;
      const state = mapResourceStatus(m.attributes?.status);
      components[componentKey(name)] = state === "ok"
        ? { state, message: name }
        : { state, message: `${name}: ${m.attributes?.status}` };
    }

    const state = worstHealthState(Object.values(components).map((c) => c.state));
    const affected = monitors.filter((m) => mapResourceStatus(m.attributes?.status) !== "ok");
    const notes: string[] = [];
    if (attrs.aggregate_state) notes.push(`page aggregate: ${attrs.aggregate_state}`);
    if (affected.length > 0) {
      notes.push(
        `affected: ${
          affected.map((m) => `${m.attributes!.public_name} (${m.attributes?.status})`).join(", ")
        }`,
      );
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
