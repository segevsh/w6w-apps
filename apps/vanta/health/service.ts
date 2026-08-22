/**
 * Is Vanta up? — its Statuspage, with the distinction that matters for a
 * compliance API.
 *
 * Verified 2026-08-18: `status.vanta.com` is a Statuspage instance named
 * "Vanta" (page id `fcv376p9krs2`) publishing components including
 * **`Vanta Public API`** — the exact surface this app calls — alongside
 * `Core App`, `3rd Party Integrations`, `Private/Partner Integrations`,
 * `Trust Center`, `Vanta AI`, `Vanta MCP Server` and `Audit Hub`.
 *
 * ## The integrations are a degradation, not an outage
 *
 * This is the interesting one. Vanta's compliance answers are only as fresh as
 * the integrations that feed them, so when `3rd Party Integrations` is down
 * **the API keeps answering and starts lying**: tests still report a status,
 * and that status stops reflecting reality.
 *
 * A check that ignored the integrations would call that healthy. A check that
 * counted them at full weight would call a stale-data problem an outage. So
 * they are capped at `degraded` and named in the message — "the API is up and
 * the answers are going stale" is the accurate thing to say, and it is exactly
 * what a workflow acting on a test result needs to know.
 *
 * `Vanta Public API` and `Core App` count at full weight. The product surfaces
 * this app never touches — Trust Center, Vanta AI, MCP, Audit Hub, Access
 * Reviews — are reported and do not count.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "status.vanta.com";

/** Statuspage's component vocabulary, mapped onto our four states. */
const STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  under_maintenance: "degraded",
  major_outage: "down",
};

/** The surfaces this app depends on directly. */
const CORE = [/^vanta public api$/i, /^core app$/i];

/** Evidence collection. Its failure makes answers stale, not absent. */
const FEEDS = [/integrations$/i, /^vanta device monitor$/i];

/** Everything else on the page — reported, not counted. */
const CONTEXT = [
  /^trust center$/i,
  /^vanta ai$/i,
  /^vanta mcp server$/i,
  /^audit hub$/i,
  /^access reviews$/i,
  /^vendor risk management$/i,
  /^questionnaire automation$/i,
  /^customer commitments$/i,
];

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** A stale feed is at worst `degraded`, however loudly the page reports it. */
const capAtDegraded = (state: HealthState): HealthState => (state === "down" ? "degraded" : state);

const service: HealthCheckDefinition = {
  key: "service",
  title: "Vanta platform status",
  description:
    "The public API this app calls, plus the integrations that feed it. An integrations outage " +
    "is capped at degraded — the API keeps answering, and its answers go stale.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as
      | { components?: Array<{ name?: string; status?: string; group?: boolean }> }
      | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    const counted: HealthState[] = [];
    const badCore: string[] = [];
    const badFeeds: string[] = [];

    for (const c of body.components) {
      if (c.group === true) continue;
      const name = String(c.name ?? "");
      if (!name) continue;
      const isCore = CORE.some((re) => re.test(name));
      const isFeed = !isCore && FEEDS.some((re) => re.test(name));
      const isContext = !isCore && !isFeed && CONTEXT.some((re) => re.test(name));
      if (!isCore && !isFeed && !isContext) continue;

      const raw = STATES[String(c.status)] ?? "unknown";
      const state = isFeed ? capAtDegraded(raw) : raw;
      components[slug(name)] = { state, message: c.status };

      if (isCore) {
        counted.push(state);
        if (c.status !== "operational") badCore.push(`${name}: ${c.status}`);
      } else if (isFeed) {
        counted.push(state);
        if (c.status !== "operational") badFeeds.push(`${name}: ${c.status}`);
      }
    }

    if (counted.length === 0) {
      return {
        state: "unknown",
        message: "the status page no longer names the API or the integrations this app depends on",
        components: Object.keys(components).length > 0 ? components : undefined,
      };
    }

    const parts: string[] = [];
    if (badCore.length > 0) parts.push(badCore.join("; "));
    if (badFeeds.length > 0) {
      parts.push(
        `evidence collection degraded (${badFeeds.join("; ")}) — the API still answers, and its ` +
          "answers are going stale",
      );
    }
    if (parts.length === 0) parts.push(`${counted.length} components operational`);

    return {
      state: worstHealthState(counted),
      message: parts.join(" · "),
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
