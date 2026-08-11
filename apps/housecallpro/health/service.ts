import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

/**
 * Is Housecall Pro up?
 *
 * ## The status page is real. It was checked three ways on 2026-08-11
 *
 * Housecall Pro publishes at **`status.housecallpro.com`**, an Atlassian
 * Statuspage.
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 *
 *   | Path                                   | Status  | Bytes   |
 *   | -------------------------------------- | ------- | ------- |
 *   | `/api/v2/summary.json`                 | 200     | 6,858   |
 *   | `/api/v2/status.json`                  | 200     | 242     |
 *   | `/api/v2/incidents.json`               | 200     | 276,368 |
 *   | `/api/v2/definitely-not-real-zzz.json` | **404** | **0**   |
 *
 * Four different answers, and the nonsense path is refused outright with an
 * empty body. Neither known unclaimed-host signature matches: an unclaimed
 * `*.statuspage.io` is ~127,700 B of HTML and an unclaimed `*.instatus.com` is
 * ~216,800 B; this is 6,858 B of JSON.
 *
 * **(b) Does the page describe THIS product?** Yes:
 *
 *     "page": { "id": "b9cs969t77x0", "name": "Housecall Pro",
 *               "url": "https://status.housecallpro.com" }
 *
 * **(c) Is it maintained, or abandoned?** Maintained. `incidents.json` carries
 * 50 incidents with real per-component attribution, the most recent on
 * 2026-07-02 (`critical`, "CSR AI Voice Assistant Call Failures"). This is not a
 * page somebody set up and forgot.
 *
 * ## Why this check is `informational`, which is the whole point
 *
 * The page has nineteen components and **not one of them covers
 * `api.housecallpro.com`**, the only host this app talks to. They are: Pro web,
 * Payment processing - Stripe, QuickBooks Online, QuickBooks Desktop, Text
 * notifications, Email notifications, Online booking, Google calendar, Consumer
 * web, Add a job API, iOS Mobile App, Android mobile app, Customer job preview,
 * Wisetack, Responsibid, Reviews, Voice, Chat, CSR AI.
 *
 * The one whose name contains "API" is the trap. **"Add a job API" is the
 * Partner Jobs API** — the separate intake surface documented at
 * `docs.housecallpro.com/docs/partner-jobs`, which lets home-warranty and
 * lead-generation companies push work orders *into* Housecall Pro's network. It
 * is a different product with different credentials and a different reference,
 * and no action in this app calls it.
 *
 * The incident history says the same thing from the other direction: of the five
 * most recent incidents, two were attributed to `CSR AI`, one to `Voice`, and
 * two to `Pro web` + the mobile apps. None to any API surface.
 *
 * A `service` check defaults to `severity: "degraded"`, which would let a
 * Google-calendar-integration blip move a verdict about the public API. It is
 * pinned to `informational` instead: the reading is published because it is what
 * the vendor says about its own platform, and it is barred from worsening
 * anything because it is not about the surface this app uses. `health/api.ts` is
 * the check that actually probes `api.housecallpro.com`.
 *
 * The check is a live probe rather than a declared absence because the page is
 * real and actively maintained — the day Housecall Pro adds a public-API
 * component, this starts producing the right signal with no code change.
 *
 * ## Annotation
 *
 *  - `kind: "service"` / `scope: "app"` — one shared platform, one answer for
 *    every Connection. Housecall Pro is SaaS-only; there is no self-hosted
 *    install and no per-tenant hostname.
 *  - `credential: "none"` — stated explicitly because it is the precondition for
 *    the egress widening below. A status host must never see a Housecall Pro key.
 *  - `network.allow` — `status.housecallpro.com` is deliberately absent from the
 *    app's own allowlist; no Action has business calling it. The allowlist does
 *    not follow redirects, so the host named here is the host actually called.
 */

export const STATUS_HOST = "status.housecallpro.com";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;

/**
 * The component that a reader will misidentify, kept as a named constant so the
 * reason survives the next person who sees "API" in a component name.
 */
export const PARTNER_JOBS_COMPONENT = "Add a job API";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string }>;
  scheduled_maintenances?: unknown[];
  status?: { indicator?: string; description?: string };
}

/**
 * Statuspage's documented component vocabulary: `operational`,
 * `degraded_performance`, `partial_outage`, `major_outage`,
 * `under_maintenance`.
 */
export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
      return "ok";
    case "degraded_performance":
    case "partial_outage":
    case "under_maintenance":
      return "degraded";
    case "major_outage":
      return "down";
    default:
      return "unknown";
  }
}

/** The page-level roll-up: `none`, `minor`, `major`, `critical`, `maintenance`. */
export function mapIndicator(indicator: string | undefined): HealthState {
  switch (indicator) {
    case "none":
      return "ok";
    case "minor":
    case "major":
    case "maintenance":
      return "degraded";
    case "critical":
      return "down";
    default:
      return "unknown";
  }
}

/**
 * Key a component by the vendor's id, falling back to a slug of the name.
 *
 * The id is stable across renames and is what the page's own incident records
 * reference. The fallback exists only so a future page that drops ids still
 * reports something rather than silently dropping rows.
 */
export function componentKey(component: StatusComponent, index: number): string {
  if (component.id) return component.id;
  if (component.name) {
    const slug = component.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `${slug}-${index}`;
  }
  return `component-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Housecall Pro platform status",
  description:
    "Statuspage summary at status.housecallpro.com. Informational only: none of its nineteen " +
    "components covers api.housecallpro.com — the one named 'Add a job API' is the separate " +
    "Partner Jobs intake API, not the public API this app calls. See the `api` check for the " +
    "host the actions actually use.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // `unknown`, never `down`: a status page that itself fails tells you nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe at
    // someone else's page — the failure mode where a healthy, claimed status page
    // belongs to an entirely different product.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.housecallpro\.com(\/|$)/i.test(pageUrl)) {
      return {
        state: "unknown",
        message: "status page no longer self-identifies as Housecall Pro's",
      };
    }

    // `group: true` rows are containers whose status merely mirrors their
    // children. Housecall Pro's page currently has none, but reporting one would
    // double-count every component beneath it.
    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
      // The name goes in the message even when healthy: the key is an opaque
      // vendor id, so without it a reader cannot tell which component this is.
      const label = node.name === PARTNER_JOBS_COMPONENT
        ? `${node.name} (Partner Jobs intake — not the public API)`
        : node.name;
      components[componentKey(node, index)] = state === "ok"
        ? { state, message: label }
        : { state, message: `${label}: ${node.status}` };
    });

    const indicator = body.status?.indicator;
    const state = indicator === undefined
      ? worstHealthState(Object.values(components).map((c) => c.state))
      : mapIndicator(indicator);

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;

    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);
    if (maintenance > 0) notes.push(`${maintenance} scheduled maintenance window(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
