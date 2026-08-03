/**
 * Is Metabase's own hosted platform up?
 *
 * ## The status page is real. It was checked three ways
 *
 * Metabase publishes an Atlassian Statuspage at **`status.metabase.com`**. All
 * three of the pack's required checks were run against it on 2026-08-03, and it
 * passes all three:
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 *
 *   | Path                                 | Status | Bytes   | md5 (first 12) |
 *   | ------------------------------------ | ------ | ------- | -------------- |
 *   | `/api/v2/status.json`                | 200    | 222     | `eb03ef240bd1` |
 *   | `/api/v2/summary.json`               | 200    | 1,031   | `9e572d1b029f` |
 *   | `/api/v2/definitely-not-real-zzz.json` | **404** | **0** | —              |
 *
 * Three different answers, and the nonsense path is refused outright rather than
 * served the same bytes. A catch-all would have returned one payload for all
 * three.
 *
 * **(b) Content-type AND body.** `application/json; charset=utf-8`, and the body
 * parses as the Statuspage v2 schema — not HTML wearing a `.json` suffix. The
 * two known unclaimed-host signatures were checked against and neither matches:
 * an unclaimed `*.statuspage.io` is 127,720 B / md5 `8d3c480a2267`, and an
 * unclaimed `*.instatus.com` is 216,836 B / md5 `b9120253d885`. This page is
 * 222 B and 1,031 B respectively.
 *
 * **(c) Does the page describe THIS product?** Yes — and note this is the check
 * that `circle.statuspage.io` passes (a) and (b) on and fails here. The page
 * self-identifies on the vendor's own domain and names Metabase's own services:
 *
 *     "page": { "id": "ktwqzqlh6n4y",
 *               "name": "Metabase Cloud",
 *               "url": "https://status.metabase.com" }
 *     "components": [ { "name": "Metabase Cloud Platform", "status": "operational" },
 *                     { "name": "Metabase Store",          "status": "operational" } ]
 *
 * `page.url` is `metabase.com`, not a third party's. (`metabase.statuspage.io`
 * resolves to the identical payload — same `page.id` — so it is the same claimed
 * page reached by its Statuspage-native name, not a separate unclaimed one.)
 *
 * ## Why this check is `informational`, deliberately
 *
 * Read what the page actually covers. Its two components are **Metabase Cloud
 * Platform** and **Metabase Store** — the vendor's *hosting business* and its
 * *billing/purchase* site. Metabase is open source (AGPL-3.0) and shipped as a
 * JAR and a Docker image; a large share of installs are somebody's own container
 * on their own infrastructure, and for those Connections every component on that
 * page is irrelevant. This check is `scope: "app"`, so it cannot know which
 * Connections are Cloud and which are not.
 *
 * Left at the `degraded` default for `kind: "service"`, an incident on Metabase
 * Cloud would pin every self-hosted tenant's App at `degraded` — a plain untruth
 * about their instance. This is the same call `apps/discourse` makes about
 * `status.discourse.org` for the same reason. `informational` says what the
 * check is: real, useful, worth displaying, and not evidence about any
 * particular Connection.
 *
 * Nothing is lost. Every Connection already has a strictly better signal for its
 * own instance: the `instance` check probes that instance's own `/api/health`,
 * per Connection, at `degraded` severity. A Cloud instance going down is
 * reported there directly rather than inferred from a fleet-wide page.
 *
 * ## Posture
 *
 * `credential: "none"` — the default for `kind: "service"`, and load-bearing: a
 * third-party status host must never see the instance's API key. `network.allow`
 * is declared for this hook alone. That declaration is technically redundant
 * while the App's own allowlist is `["*"]` (see `lib/client.ts` for why it has
 * to be), but it is written out so the intent survives if that allowlist is ever
 * narrowed, and so a reader of the manifest can see that this hook — and only
 * this hook — talks to `status.metabase.com`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.metabase.com/api/v2/summary.json";

interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatuspageSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatuspageComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
  scheduled_maintenances?: unknown[];
  status?: { indicator?: string; description?: string };
}

/**
 * Statuspage's documented component vocabulary
 * (<https://metastatuspage.com/api>): `operational`, `degraded_performance`,
 * `partial_outage`, `major_outage`, `under_maintenance`.
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

/**
 * Statuspage's page-level roll-up indicator: `none`, `minor`, `major`,
 * `critical`, `maintenance`.
 */
export function mapIndicator(indicator: string | undefined): HealthState {
  switch (indicator) {
    case "none":
      return "ok";
    case "minor":
    case "maintenance":
      return "degraded";
    case "major":
      return "degraded";
    case "critical":
      return "down";
    default:
      return "unknown";
  }
}

/** Slugify a component name into a stable `component:<id>` selector. */
export function componentId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Metabase Cloud status",
  description:
    "Component status from status.metabase.com (Atlassian Statuspage). Covers Metabase's own " +
    "hosting and store — a self-hosted instance is unaffected, which is why this check is " +
    "informational and the per-connection `instance` check carries the weight.",
  kind: "service",
  scope: "app",
  // Stated rather than left to the `kind: "service"` default. It is the
  // precondition for the `network` widening below — a check that reaches a
  // third-party host MUST be unsigned — and a rule that load-bearing should be
  // legible in the manifest, not inferred.
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: ["status.metabase.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Metabase — never `down`.
      return { state: "unknown", message: `Statuspage returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatuspageSummary | null;
    if (!body) return { state: "unknown", message: "Statuspage returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe at
    // somebody else's status page — the `circle.statuspage.io` failure mode,
    // where a healthy, claimed page belongs to an entirely different product.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)metabase\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Metabase's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Statuspage returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      components[componentId(node.name!)] = state === "ok"
        ? { state }
        : { state, message: node.status };
    }

    // Prefer the vendor's own roll-up when it gives one; fall back to worst-of.
    const indicator = body.status?.indicator;
    const state = indicator === undefined
      ? worstHealthState(Object.values(components).map((c) => c.state))
      : mapIndicator(indicator);

    const affected = Object.entries(components).filter(([, c]) => c.state !== "ok");
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;

    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    if (affected.length > 0) notes.push(`affected: ${affected.map(([id]) => id).join(", ")}`);
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
