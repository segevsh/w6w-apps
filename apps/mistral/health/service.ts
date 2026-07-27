/**
 * Is Mistral up? — read from the status feed, which is the only machine-readable
 * surface the vendor publishes.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — this answers "is the vendor's platform up", which is a
 *     different question from "is this credential live" (the derived `auth:*`
 *     check) or "is there quota left" (`quota`).
 *   - `scope: "app"` (the default for this kind) — the answer is identical for
 *     every Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — status.mistral.ai is not on the app's egress allowlist
 *     and has no business being reachable from an action. Widening it for this
 *     one hook is permitted precisely because the posture is unsigned.
 *   - `severity` defaults to `degraded` for this kind.
 *
 * A feed is a log of UPDATES, not a statement of current state, and conflating
 * the two is the trap here. Mistral's feed currently carries 50 entries
 * describing 26 incidents: every update to an incident is its own entry, and
 * the newest entry for a *resolved* incident still carries the incident's
 * original title ("Audio API Degraded"). Judging by the newest entry's title
 * therefore reports an outage that ended days ago.
 *
 * So the entries are folded to the newest update per incident id, and each
 * incident's state is read from the `Status:` line the vendor puts at the head
 * of every update body — an explicit machine-readable field, not a guess. An
 * incident counts as open only while its newest update says so.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { latestPerId, listItems, parseFeed } from "../lib/feed.ts";

const STATUS_HOST = "status.mistral.ai";

/**
 * The vendor's own update vocabulary. `Resolved` and `Completed` close an
 * incident; the rest mean it is still running. An unrecognised value is treated
 * as open — under-reporting an outage is the worse failure.
 */
const CLOSED = new Set(["resolved", "completed", "postmortem"]);

/** How an open incident's phase maps onto our four states. */
const PHASE: Record<string, HealthState> = {
  investigating: "degraded",
  identified: "degraded",
  monitoring: "degraded",
  degraded: "degraded",
  outage: "down",
  down: "down",
};

/** Read the `Status: X` field the vendor writes at the head of each update. */
function statusOf(summary: string): string | undefined {
  return /^\s*status:\s*([a-z]+)/i.exec(summary)?.[1]?.toLowerCase();
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Mistral platform status",
  description:
    "Open incidents from Mistral's status feed. Updates are folded per incident and state is read from each incident's `Status:` field, not inferred from the newest headline.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/feed.rss`);
    // `unknown`, never `down`: a feed that itself fails tells us nothing about
    // Mistral, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status feed returned ${res.status}` };

    const { entries } = parseFeed(await res.text());
    // An empty feed means nothing has ever been announced, which is good news;
    // a feed we could not read is not the same thing and says so.
    if (entries.length === 0) {
      return { state: "ok", message: "no entries in the status feed", ttlSeconds: 300 };
    }

    const incidents = latestPerId(entries);
    const open = incidents.filter((i) => {
      const status = statusOf(i.summary);
      return status === undefined ? true : !CLOSED.has(status);
    });
    if (open.length === 0) return { state: "ok", ttlSeconds: 300 };

    // One probe, many components: the vendor lists the affected services as an
    // `<li>` list in the update body, so an Audio API incident does not have to
    // grey out the whole platform.
    const components: Record<string, HealthComponentReport> = {};
    const states: HealthState[] = [];
    for (const incident of open) {
      const state = PHASE[statusOf(incident.summary) ?? ""] ?? "degraded";
      states.push(state);
      for (const svc of listItems(incident.summaryHtml)) {
        const id = svc.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        if (id) components[id] = { state, message: incident.title };
      }
    }

    return {
      state: states.includes("down") ? "down" : "degraded",
      message: open.map((i) => i.title).join("; "),
      ...(Object.keys(components).length > 0 ? { components } : {}),
      ttlSeconds: 300,
    };
  },
};

export default service;
