/**
 * Is Kajabi up?
 *
 * ## Finding the right status page, and rejecting two wrong ones
 *
 * The page was not guessed from the vendor's name — it was found in Kajabi's
 * own markup. `GET https://api.kajabi.com/v1/totally_bogus_zzz` returns a 404
 * page (`text/html`, served by the API host itself) whose footer links
 * `https://status.kajabi.com/` under the label "App Status". That is a
 * first-party citation from the same host this app calls, which is a stronger
 * provenance than a hostname that merely looks plausible.
 *
 * All candidates checked on the wire 2026-08-03:
 *
 *   | URL                       | Result                                                       |
 *   | ------------------------- | ------------------------------------------------------------ |
 *   | `status.kajabi.com`       | 200, `text/html`, 132,241 B — **the real page**, and the one Kajabi's own 404 links to |
 *   | `kajabi.statuspage.io`    | 200, 132,256 B — the same Statuspage under its `statuspage.io` name; **not** the 127,720 B / md5 `8d3c480a2267` unclaimed-subdomain shell |
 *   | `kajabi.instatus.com`     | 200 after redirecting to `instatus.com`, **216,836 B, md5 `b9120253d885`** — the known unclaimed-Instatus trap, hit exactly as catalogued. Rejected. |
 *   | `status.kajabi.io`        | DNS does not resolve                                          |
 *
 * The canonical `status.kajabi.com` is used rather than the `statuspage.io`
 * alias, since that is the one the vendor publishes.
 *
 * ## The three required checks
 *
 * **(a) Bogus sibling paths on the same host** — a catch-all would answer
 * identically for everything. This host routes:
 *
 *   | Path                          | Result                                    |
 *   | ----------------------------- | ----------------------------------------- |
 *   | `/api/v2/summary.json`        | 200, `application/json`, 5,954 B           |
 *   | `/api/v2/status.json`         | 200, `application/json`, 229 B             |
 *   | `/api/v2/components.json`     | 200, `application/json`, 5,841 B           |
 *   | `/api/v2/notarealthing.json`  | **404, 0 bytes, no content-type**          |
 *   | `/api/v9/summary.json`        | **404, 0 bytes**                           |
 *   | `/totally-bogus-zzz`          | **404, 0 bytes**                           |
 *
 * Three real paths, three distinct lengths, and three different bogus paths all
 * 404 with an empty body.
 *
 * **(b) Content type and body** — `application/json; charset=utf-8` on a
 * `.json` path (not HTML), and the payload parses as a Statuspage summary.
 *
 * **(c) Does the page describe THIS product?** This is the check that
 * `circle.statuspage.io` passed (a) and (b) on while belonging to a Discord
 * bot. Kajabi's passes on both available signals: `page.url` is
 * `https://status.kajabi.com` — the vendor's own domain, matching where we
 * fetched it — with `page.name: "Kajabi"` and `page.id: "rqkb85mpqyr3"`. And
 * the component names are unmistakably this product and no other: *Offer
 * Checkout*, *Inbound Webhooks*, *Coupons*, *Kajabi Signups*, *Automated Site
 * Emails*, *Custom Email Domain Setup (CEDS)*, *Marketing Email Editing and
 * Scheduling*, *Page rendering*, grouped under *Admin*, *API*, *Checkout*,
 * *Email*, *Sites* and *Support*.
 *
 * ## The trap: the group called "API" is not this app's API
 *
 * The obvious narrowing — track the component group named **API**, the way the
 * sibling `circle` app tracks its *Developer API* group — is **wrong here**, and
 * quietly so.
 *
 * Kajabi's `API` group (`id: 6ht1c6z0fty9`) contains exactly one leaf
 * component: **Inbound Webhooks**. That is the Zapier-style webhook *receiver*
 * described in the help-centre article this app's catalogue entry mistook for
 * developer documentation. It is a different surface from the public REST API
 * at `api.kajabi.com`, and this app does not touch it. A check narrowed to that
 * group would report the health of a feature no action here uses, while
 * reporting nothing about the one they all use.
 *
 * There is no component for the public REST API on this page at all. Kajabi
 * shipped that API in late 2025; the status page has not grown a component for
 * it.
 *
 * ## What is tracked instead, and why the severity is `informational`
 *
 * The verdict tracks **App Availability** — the top-level ungrouped component
 * (`id: sh9xbcyzjks9`) that reports whether Kajabi itself is serving. It is the
 * only component on the page that is a genuine precondition for
 * `api.kajabi.com`: if Kajabi is down, the REST API is down with it. Everything
 * else on the page is either a surface this app never touches (page rendering,
 * marketing email scheduling, custom email domain setup, Kajabi signups) or the
 * wrong API.
 *
 * But the converse does not hold — *App Availability* being green does **not**
 * prove the REST API is healthy, because nothing on this page speaks for it.
 * The signal is therefore genuinely one-directional, and that is why
 * `severity: "informational"` is set rather than left at the `degraded`
 * default. This check can tell an operator "Kajabi is having an outage, that is
 * probably your problem"; it cannot certify the opposite, and it should not be
 * able to pull a tenant's app into `degraded` on the strength of a component
 * that only partially covers it.
 *
 * That is the same reasoning `discourse` and `followupboss` apply, reached from
 * a different direction: there, the rollup was too broad; here, the page has no
 * component narrow enough to be conclusive.
 *
 * If Kajabi ever adds a REST API component, this check should narrow to it and
 * the severity should go back to the default. The fallback below is written so
 * that a *removed* `App Availability` component fails loudly rather than
 * silently changing meaning.
 *
 * ## Posture
 *
 * `credential: "none"` (this kind's default) and load-bearing — a third-party
 * status host must never see a Kajabi access token. `network.allow` widens
 * egress to `status.kajabi.com` for this hook alone; that host is deliberately
 * absent from the app's own allowlist, because no action has business calling
 * it.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

const STATUS_HOST = "status.kajabi.com";

export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;

/**
 * The component this app's availability actually depends on, as named on
 * `status.kajabi.com`. Matched case-insensitively via `slug` so a
 * capitalisation change does not drop the check into its fallback.
 */
export const AVAILABILITY_COMPONENT = "App Availability";

/**
 * The component group deliberately NOT used, recorded so the reasoning survives
 * a future edit. Kajabi's `API` group covers *Inbound Webhooks* — the webhook
 * receiver — not the public REST API this app calls. See the header.
 */
export const NOT_THE_REST_API_GROUP = "API";

/** Statuspage's four roll-up indicators. */
const INDICATOR: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
};

/** Statuspage's per-component vocabulary. */
const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

export interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

export interface StatuspageSummary {
  page?: { id?: string; name?: string; url?: string };
  status?: { indicator?: string; description?: string };
  components?: StatuspageComponent[];
  incidents?: unknown[];
  scheduled_maintenances?: unknown[];
}

/** Slugify a component name into a stable `component:<id>` selector. */
export function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function componentState(status: string | undefined): HealthState {
  return COMPONENT[status ?? ""] ?? "unknown";
}

export function indicatorState(indicator: string | undefined): HealthState {
  return INDICATOR[indicator ?? ""] ?? "unknown";
}

/**
 * Find the leaf component the verdict is drawn from.
 *
 * Group headers are skipped explicitly: Statuspage models a group as a
 * component with `group: true`, and matching one would read a roll-up of
 * children rather than the component asked for.
 */
export function findComponent(
  components: StatuspageComponent[],
  name: string = AVAILABILITY_COMPONENT,
): StatuspageComponent | undefined {
  return components.find((c) => !c.group && slug(c.name ?? "") === slug(name));
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Kajabi platform status",
  description: "Atlassian Statuspage summary for status.kajabi.com. The verdict tracks the `App " +
    "Availability` component — Kajabi publishes no component for the public REST API, and its " +
    "`API` group covers inbound webhooks, which this app does not use. Informational: an " +
    "outage here explains a failure, but a green board cannot certify the REST API.",
  kind: "service",
  scope: "app",
  covers: ["*"],
  severity: "informational",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // `unknown`, never `down`: a status page that itself fails says nothing
    // about Kajabi, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `Statuspage returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatuspageSummary | null;
    if (!body) return { state: "unknown", message: "Statuspage returned an unreadable body" };

    const all = body.components ?? [];
    const components: Record<string, HealthComponentReport> = {};
    for (const c of all) {
      // Skip group headers — they restate their children's worst state.
      if (!c.name || c.group) continue;
      const state = componentState(c.status);
      components[slug(c.name)] = state === "ok" ? { state } : { state, message: c.status };
    }
    if (Object.keys(components).length === 0) {
      return { state: "unknown", message: "Statuspage returned no named components" };
    }

    const notes: string[] = [];
    const availability = findComponent(all);
    let state: HealthState;
    if (availability) {
      state = componentState(availability.status);
      const indicator = body.status?.description;
      if (indicator) notes.push(`platform-wide: ${indicator}`);
    } else {
      // The component is gone or renamed. Fall back loudly rather than quietly
      // reporting a number that no longer means what this check thinks.
      state = indicatorState(body.status?.indicator);
      notes.push(
        "no `App Availability` component on the status page — falling back to Kajabi's " +
          "platform-wide indicator, which also aggregates page rendering, marketing email and " +
          "signups",
      );
    }

    const affected = Object.entries(components).filter(([, c]) => c.state !== "ok");
    if (affected.length > 0) notes.push(`affected: ${affected.map(([id]) => id).join(", ")}`);
    const open = body.incidents?.length ?? 0;
    if (open > 0) notes.push(`${open} open incident(s)`);
    const maintenance = body.scheduled_maintenances?.length ?? 0;
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
