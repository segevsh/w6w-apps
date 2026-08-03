/**
 * Is Circle up?
 *
 * ## The right status page, and the two wrong ones
 *
 * "Circle" is a crowded name, and two of the three obvious status hosts belong
 * to somebody else. All verified on the wire 2026-08-03:
 *
 *   | URL                          | Result                                                        |
 *   | ---------------------------- | ------------------------------------------------------------- |
 *   | `status.circle.so`           | 200, `text/html`, 567,805 B — **the real page**                |
 *   | `circle.statuspage.io`       | 200 — a claimed Statuspage titled "Circle Status", but its API says `{"page":{"id":"zswtg41vp2vd","name":"Circle","url":"https://status.circlebot.xyz"…}` — **a different Circle entirely** (a Discord bot) |
 *   | `circleso.statuspage.io`     | 200 — after redirecting to `atlassian.com/software/statuspage`, **127,720 B** of marketing HTML, md5 `8d3c480a2267` — the known unclaimed-subdomain trap, hit exactly as described |
 *
 * The middle row is the interesting one, and the reason this file names a page
 * id rather than trusting a hostname: `circle.statuspage.io` is not the
 * Atlassian shell, it is a *real, claimed* status page — for an unrelated
 * product. A probe that reached it would report green while circle.so burned,
 * and nothing about the response would look wrong. (The third obvious
 * candidate, `status.circle.com`, belongs to the USDC company and is not this
 * product either. This App is circle.so, the community platform.)
 *
 * ### Verifying the real endpoint two ways
 *
 * Per the pack's rule that a 200 on a `.json` path proves nothing, both:
 *
 * **(a) Deliberately bogus siblings on the same host.**
 *
 *   | Path                              | Result                                          |
 *   | --------------------------------- | ----------------------------------------------- |
 *   | `/api/v2/summary.json`            | 200, `application/json`, 6,885 B                 |
 *   | `/api/v2/status.json`             | 200, `application/json`, 211 B                   |
 *   | `/api/v2/components.json`         | 200, `application/json`, 6,772 B                 |
 *   | `/api/v2/notarealthing.json`      | **404, 0 bytes, no content-type**                |
 *   | `/api/v9/summary.json`            | **404, 0 bytes**                                 |
 *   | `/api/v2/summary` *(no suffix)*   | **400**, `{"error":…}`                           |
 *   | `/totally-bogus-zzz`              | **404, 0 bytes**                                 |
 *
 * Four different answers across seven paths, each real path a different length.
 * A catch-all returns one body for everything; this host routes.
 *
 * **(b) Content-type and body.** `application/json; charset=utf-8`, and the
 * payload opens `{"page":{"id":"qjlztzff1xhv","name":"Circle","url":"https://status.circle.so"…}`
 * over twenty components that are unmistakably this product: *Communities*,
 * *Posts & Comments*, *Courses*, *Events*, *Paywalls & Member Billing*,
 * *Live Streams & Rooms*, *Marketing Hub*, *Workflows*, *Circle iOS App*,
 * *Branded Apps*, and — under a **Developer API** group — *REST API*. No HTML
 * catch-all and no unclaimed subdomain fabricates that list.
 *
 * ## Why the verdict is NOT the vendor's own indicator
 *
 * `summary.json` carries a global `status.indicator`, and taking it would be
 * the one-liner. It is wrong here. That indicator aggregates *Circle iOS App*,
 * *Circle Android App*, *Branded Apps*, *Circle Discover* and *Circle Help
 * Center* — none of which this App can reach, none of which affect a workflow,
 * and any of which can go orange without the Admin API missing a beat. Using it
 * would degrade every tenant's App because Circle's help centre was down.
 *
 * So the state is computed from the **Developer API** component group — the one
 * that contains *REST API*, which is literally what every action in this App
 * calls. All other components are still reported under `components` for
 * display, and the vendor's own indicator is folded into `message`, so nothing
 * is hidden; it just does not drive the verdict.
 *
 * If Circle ever renames or removes that group, the group lookup finds nothing
 * and the check falls back to the global indicator, saying so in the message.
 * A silent fallback would be worse than a loud one: the failure mode of a
 * renamed group is "this check quietly stops meaning anything".
 *
 * ## Why `severity` stays at the default `degraded`
 *
 * The sibling `discourse` app marks its service check `informational`, because
 * `status.discourse.org` reports Discourse's *hosting business* and most
 * Discourse forums are self-hosted and unaffected by it. **That reasoning does
 * not transfer, and the difference is the whole point.** Circle is fully
 * vendor-hosted: there is no self-hosted Circle, every community's Admin API is
 * served from the single host `app.circle.so`, and no tenant supplies a host of
 * its own. A REST API outage on this page therefore *does* affect every
 * Connection, without exception — which is exactly the situation `degraded` is
 * for. Marking it informational would suppress a signal that is true for
 * everyone.
 *
 * The narrowing above is what makes that defensible: the check only carries
 * `degraded` weight for the component this App actually depends on.
 *
 * ## Posture
 *
 * `credential: "none"` (this kind's default) and load-bearing — a third-party
 * status host must never see a community's Admin token. `network.allow` widens
 * egress to `status.circle.so` for this hook alone; that host is deliberately
 * absent from the App's own allowlist, because no action has business calling
 * it.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "status.circle.so";

export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;

/**
 * The component group whose health this App actually depends on, as named on
 * `status.circle.so`. Matched case-insensitively so a capitalisation change
 * does not silently drop the check into its fallback.
 */
export const API_GROUP_NAME = "developer api";

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
  page?: { id?: string; name?: string };
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
 * States of the leaf components under the named group.
 *
 * Statuspage models a group as a component with `group: true`, and its members
 * as components whose `group_id` is the group's `id`. The group row itself is
 * skipped: it restates its children's worst state, so counting it would
 * double-weight the group against nothing.
 */
export function apiGroupStates(
  components: StatuspageComponent[],
  groupName: string = API_GROUP_NAME,
): HealthState[] {
  const group = components.find((c) => c.group && slug(c.name ?? "") === slug(groupName));
  if (!group?.id) return [];
  return components
    .filter((c) => !c.group && c.group_id === group.id)
    .map((c) => componentState(c.status));
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Circle platform status",
  description:
    "Atlassian Statuspage summary for status.circle.so. The verdict tracks the Developer API " +
    "component group — the REST API this app calls — rather than Circle's global indicator, " +
    "which also aggregates the mobile apps and the help centre. All components are reported.",
  kind: "service",
  scope: "app",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // `unknown`, never `down`: a status page that itself fails says nothing
    // about Circle, and reporting that as an outage would be a lie.
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
    const apiStates = apiGroupStates(all);
    let state: HealthState;
    if (apiStates.length > 0) {
      state = worstHealthState(apiStates);
      const indicator = body.status?.description;
      if (indicator) notes.push(`platform-wide: ${indicator}`);
    } else {
      // The group is gone or renamed. Fall back loudly rather than quietly
      // reporting a number that no longer means what this check thinks.
      state = indicatorState(body.status?.indicator);
      notes.push(
        "no `Developer API` component group on the status page — falling back to Circle's " +
          "platform-wide indicator, which also covers the mobile apps and help centre",
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
