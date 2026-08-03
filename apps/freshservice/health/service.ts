/**
 * Is the Freshservice platform up?
 *
 * ## Finding a probe that is real
 *
 * Freshworks runs three things that look like a status service, and two of
 * them are traps:
 *
 *  - `status.freshservice.com` **302s to `updates.freshservice.com` and throws
 *    the path away** — `/rss`, `/anything` all land on the marketing root with
 *    a 200 and an HTML body. Anything built on it would report "up" forever,
 *    including while the API was down.
 *  - `freshservice.statuspage.io` and `freshworks.statuspage.io` are
 *    **unclaimed Atlassian Statuspage subdomains**; both redirect to
 *    `/inactive`. They belong to nobody.
 *  - `updates.freshservice.com` is the genuine Freshstatus-hosted page. Its
 *    RSS feed at `/rss/` is real (`application/xml`, RSS 2.0, sibling paths
 *    404 rather than catch-all) — but it is a **history log with no
 *    resolution marker**: every entry carries the incident's opening prose and
 *    nothing machine-readable says whether it is still open. Judging current
 *    state from it would be guesswork, which `rfcs/healthcheck.md` explicitly
 *    forbids ("Where a vendor offers nothing like it, report `unknown` rather
 *    than inventing a state").
 *
 * What is real is the API behind that page. Freshstatus — Freshworks' own
 * status-page product — serves `https://public-api.freshstatus.io/v1/`
 * unauthenticated, and `updates.freshservice.com` is account `3616` on it.
 * `GET /v1/public-components/?account_id=3616` returns the component tree with
 * a machine-readable `status` per leaf. Verified on the wire: 200
 * `application/json`, 220 components; a bogus sibling path
 * (`/v1/public-zzz-not-real/`) 404s with an HTML body, so this is not a
 * catch-all.
 *
 * ## Reading it the way the vendor does
 *
 * Two details are taken from Freshworks' own status client rather than
 * guessed:
 *
 *  - the status vocabulary is `OP` / `PD` / `PO` / `MO` / `UM`;
 *  - a component carrying `display_options.ignore_overall_status === "true"`
 *    is **excluded from the overall verdict** by the vendor's own roll-up.
 *    This is load-bearing today: all 36 MEA-region components sit at `MO`
 *    behind that flag (the region is being wound down and its accounts
 *    migrated), so a naive worst-of roll-up would pin every Freshservice
 *    connection at `down` indefinitely.
 *
 * The tree is grouped by region, so this reports one component per region —
 * one call, many components, which is the shape the RFC asks for. A
 * connection's region is not derivable from its subdomain, so the overall
 * state is the worst of the regions the vendor counts.
 *
 * `credential: "none"` (the default for `kind: "service"`) and
 * `network.allow` widened for this hook only: a status host must never see a
 * credential, and `public-api.freshstatus.io` is deliberately absent from the
 * App's own egress allowlist.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

/** The Freshstatus account behind updates.freshservice.com. */
export const FRESHSTATUS_ACCOUNT_ID = 3616;

export const COMPONENTS_URL =
  `https://public-api.freshstatus.io/v1/public-components/?account_id=${FRESHSTATUS_ACCOUNT_ID}`;

interface FreshstatusComponent {
  id: number;
  name: string;
  status?: string;
  display_options?: Record<string, string>;
  components?: FreshstatusComponent[];
}

/** Freshstatus' status vocabulary, as used by Freshworks' own status client. */
export function mapStatus(code: string | undefined): HealthState {
  switch (code) {
    case "OP":
      return "ok";
    case "PD": // degraded performance
    case "UM": // under maintenance
    case "PO": // partial outage
      return "degraded";
    case "MO": // major outage
      return "down";
    default:
      return "unknown";
  }
}

/** Slugify a region name into a stable `component:<id>` selector. */
export function componentId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Leaf components under a node, minus the ones the vendor excludes from roll-up. */
function countedLeaves(node: FreshstatusComponent): FreshstatusComponent[] {
  const out: FreshstatusComponent[] = [];
  const walk = (n: FreshstatusComponent) => {
    if (typeof n.status === "string") {
      if (n.display_options?.ignore_overall_status !== "true") out.push(n);
    }
    for (const child of n.components ?? []) walk(child);
  };
  walk(node);
  return out;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Freshservice platform status",
  description:
    "Component status from Freshstatus, the platform behind updates.freshservice.com. Reports one component per hosting region.",
  kind: "service",
  covers: ["*"],
  network: { allow: ["public-api.freshstatus.io"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(COMPONENTS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about the vendor — never `down`.
      return { state: "unknown", message: `Freshstatus returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as
      | { components?: FreshstatusComponent[] }
      | null;
    const regions = body?.components;
    if (!Array.isArray(regions) || regions.length === 0) {
      return { state: "unknown", message: "Freshstatus returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    const states: HealthState[] = [];

    for (const region of regions) {
      const leaves = countedLeaves(region);
      // A region whose every component is flagged `ignore_overall_status`
      // contributes nothing — that is exactly what the flag means.
      if (leaves.length === 0) continue;
      const state = worstHealthState(leaves.map((leaf) => mapStatus(leaf.status)));
      const bad = leaves.filter((leaf) => leaf.status !== "OP");
      components[componentId(region.name)] = bad.length === 0 ? { state } : {
        state,
        message: `${bad.length}/${leaves.length} components affected`,
      };
      states.push(state);
    }

    if (states.length === 0) {
      return { state: "unknown", message: "no components counted towards overall status" };
    }

    const state = worstHealthState(states);
    const affected = Object.entries(components).filter(([, c]) => c.state !== "ok");
    return {
      state,
      message: affected.length === 0
        ? undefined
        : `affected regions: ${affected.map(([id]) => id).join(", ")}`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
