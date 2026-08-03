import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is Buffer up?
 *
 * ## Establishing that this is Buffer's page and not somebody else's
 *
 * Three checks, all run on the wire 2026-08-03. The third exists because the
 * first two can both pass on a page belonging to an entirely different product
 * — that is exactly what happened to the sibling `circle` app, where
 * `circle.statuspage.io` turned out to be a *claimed, healthy, correctly
 * routing* Statuspage for a Discord bot.
 *
 * **(a) A bogus sibling path on the same host.** A catch-all returns one body
 * for everything; a real Statuspage routes.
 *
 *   | Path                              | Result                                |
 *   | --------------------------------- | ------------------------------------- |
 *   | `/api/v2/summary.json`            | **200**, `application/json`, 4,066 B  |
 *   | `/api/v2/bogus-not-real.json`     | **404, 0 bytes, no content-type**     |
 *   | `/`                               | 200, `text/html`, 106,384 B           |
 *
 * Three different answers across three paths.
 *
 * **(b) Content-type and body.** `application/json`, and it parses as the
 * Statuspage v2 schema — `page`, `status`, `components`, `incidents`,
 * `scheduled_maintenances` — not HTML wearing a `.json` suffix. It is also not
 * either of the known unclaimed-subdomain signatures (Statuspage's is 127,720 B
 * / md5 `8d3c480a2267`; Instatus's is 216,836 B / md5 `b9120253d885`), and it
 * does not 401 with "Your page is inactive", which is what a decommissioned
 * page does.
 *
 * **(c) Does the page describe THIS product?** The decisive one.
 *
 *   ```json
 *   "page": { "id": "01JAQVAANK9BQ3TJ084A1V89HH",
 *             "name": "Buffer",
 *             "url": "https://status.buffer.com/",
 *             "updated_at": "2026-07-09T10:54:59Z" }
 *   ```
 *
 * `page.url` points at Buffer's **own domain**, not at a `*.statuspage.io`
 * subdomain someone else claimed, and the nineteen component names are
 * unmistakably this product and no other: *Buffer API*, *Buffer MCP*,
 * *Publishing*, *Analytics*, *Channel connections*, *Login*, *Settings*,
 * *Community*, and one component per network — *Facebook*, *X*, *Bluesky*,
 * *Youtube*, *TikTok*, *Mastodon*, *Pinterest*, *Google Business profile*,
 * *Threads*, *Instagram*, *LinkedIn*. The page is also linked from Buffer's own
 * developer documentation (`developers.buffer.com` links `https://status.buffer.com/`
 * in its header), which is a fourth, independent confirmation.
 *
 * ## Why the verdict is NOT Buffer's own indicator
 *
 * `summary.json` carries a global `status.indicator` and taking it would be the
 * one-liner. It is wrong here, for the reason the pack keeps running into: the
 * rollup aggregates surfaces this app cannot reach and does not depend on.
 * *Login*, *Settings*, *Analytics*, *Community* and *Buffer MCP* are all in it,
 * and any of them can go orange while `api.buffer.com` answers perfectly. Using
 * the rollup would degrade every tenant's app because Buffer's community forum
 * was down.
 *
 * So the state is computed from the **`Buffer API`** component alone — which is
 * literally the surface every action, both auth `test` hooks and the `quota`
 * check call. Everything else is still reported under `components` for
 * attribution, and Buffer's own indicator is folded into `message`, so nothing
 * is hidden; it just does not drive the verdict.
 *
 * ### The one judgement call: `Publishing` is attribution, not verdict
 *
 * `Publishing` is the component that covers a scheduled post actually going out
 * to a network later. It is tempting to fold into the verdict because this is a
 * scheduling app — but it is a *different* failure from the one this check is
 * about. If `Publishing` is degraded, `post-create` still succeeds: the post is
 * accepted and queued, exactly as the API contract says. Nothing a workflow
 * does synchronously fails. The same goes for the eleven per-network components
 * — an Instagram outage surfaces later as a `RestProxyError` arm on the post,
 * which the actions already report.
 *
 * Folding those in would make the check answer "will this eventually publish?"
 * rather than "will my call work?", and a host reading `degraded` would have no
 * way to tell which it meant. They are reported and named in the message
 * instead, so an operator sees them without the verdict being driven by them.
 *
 * ## Why `severity` stays at the default `degraded`
 *
 * The sibling `discourse` app downgrades its service check to `informational`
 * because most Discourse forums are self-hosted and unaffected by the vendor's
 * status page. **That reasoning does not transfer.** Buffer is fully
 * vendor-hosted: there is no self-hosted Buffer, every account's API is served
 * from the single origin `api.buffer.com`, and no tenant supplies a host of its
 * own. A `Buffer API` outage on this page therefore affects every Connection
 * without exception, which is precisely the situation `degraded` exists for.
 *
 * The narrowing above is what makes that defensible: the check only carries
 * `degraded` weight for the one component this app actually depends on.
 *
 * ## Posture
 *
 * `credential: "none"` (this kind's default) and load-bearing — a third-party
 * status host must never see a Buffer key or access token. `network.allow`
 * widens egress to `status.buffer.com` for this hook alone; that host is
 * deliberately absent from the app's own allowlist, because no action has
 * business calling it.
 */

const STATUS_HOST = "status.buffer.com";

export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;

/**
 * The component whose health this app depends on, as named on the page.
 * Matched case-insensitively via `slug()` so a capitalisation change does not
 * silently drop the check into its fallback.
 */
export const API_COMPONENT_NAME = "Buffer API";

/**
 * Components reported for attribution but deliberately excluded from the
 * verdict — see the doc comment. Named here rather than inline so the message
 * can call them out and the tests can assert the boundary.
 */
export const DELIVERY_COMPONENT_NAME = "Publishing";

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

/** Find one leaf component by name, case- and punctuation-insensitively. */
export function findComponent(
  components: StatuspageComponent[],
  name: string,
): StatuspageComponent | undefined {
  return components.find((c) => !c.group && slug(c.name ?? "") === slug(name));
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Buffer platform status",
  description:
    "Atlassian Statuspage summary for status.buffer.com. The verdict tracks the `Buffer API` " +
    "component — the origin every action calls — rather than Buffer's global indicator, which " +
    "also aggregates Login, Settings, Analytics, Community and the MCP server. `Publishing` " +
    "and the per-network components are reported for attribution but do not drive the state: " +
    "they affect whether a queued post goes out later, not whether an API call works.",
  kind: "service",
  scope: "app",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // `unknown`, never `down`: a status page that itself fails says nothing
    // about Buffer, and reporting that as an outage would be a lie.
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
    const api = findComponent(all, API_COMPONENT_NAME);
    let state: HealthState;
    if (api) {
      state = componentState(api.status);
      const indicator = body.status?.description;
      if (indicator) notes.push(`platform-wide: ${indicator}`);
    } else {
      // The component is gone or renamed. Fall back loudly rather than quietly
      // reporting a number that no longer means what this check thinks. A
      // silent fallback's failure mode is "this check stops meaning anything".
      state = indicatorState(body.status?.indicator);
      notes.push(
        `no \`${API_COMPONENT_NAME}\` component on the status page — falling back to Buffer's ` +
          "platform-wide indicator, which also covers Login, Settings, Analytics and Community",
      );
    }

    // Delivery is called out by name rather than left in the crowd, because it
    // is the component an operator will want next after the API one and it is
    // deliberately not in the verdict.
    const delivery = findComponent(all, DELIVERY_COMPONENT_NAME);
    if (delivery && componentState(delivery.status) !== "ok") {
      notes.push(
        `${DELIVERY_COMPONENT_NAME}: ${delivery.status} — queued posts may not go out; API ` +
          "calls are unaffected",
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
