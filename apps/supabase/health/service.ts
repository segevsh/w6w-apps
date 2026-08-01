/**
 * Is Supabase's platform up? — read from its Statuspage.io feed, the only
 * machine-readable status surface it publishes (verified 2026-07-31:
 * https://status.supabase.com/ links "Atom Feed" / "RSS Feed" in its footer,
 * resolving to https://status.supabase.com/history.atom).
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — this answers "is the vendor's platform up", a
 *     different question from "is this credential live" (the derived
 *     `auth:*` check).
 *   - `scope: "app"` (the default for this kind) — the answer is identical
 *     for every Connection (every Supabase project runs on the same shared
 *     platform), so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `feed` — declared, not fetched here; the host fetches and parses the
 *     Atom document and hands entries over as `input.feed`. Atom is preferred
 *     over the equivalent RSS feed per rfcs/healthcheck.md: its `<updated>`
 *     says when an entry last changed, not just when it was first published.
 *     `status.supabase.com` is added to this hook's allowlist implicitly by
 *     the declaration, so it is absent from `network.allow`.
 *   - `severity` defaults to `degraded` for this kind.
 *
 * A feed is a log of UPDATES, not a statement of current state. Statuspage.io
 * (the vendor behind status.supabase.com) keeps ONE Atom entry per incident
 * and rewrites its `<content>` in place on every update, with the most recent
 * update's status word first — e.g. an ongoing incident's entry reads
 * "Update - ..." or "Investigating - ...", and a closed one reads
 * "Resolved - ...". Reading that leading word is reading a real, vendor-
 * written field, not guessing from prose.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const RESOLVED = /^\s*resolved\b/i;

/** Every other leading Statuspage.io status word means the incident is open. */
const OPEN_STATE: HealthState = "degraded";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Supabase platform status",
  description:
    "Open incidents from Supabase's Statuspage.io status feed. State is read from each " +
    "incident's leading status word (Investigating/Identified/Monitoring/Update/Resolved), " +
    "not from the newest headline.",
  kind: "service",
  covers: ["*"],
  feed: { url: "https://status.supabase.com/history.atom", format: "atom" },
  minIntervalSeconds: 120,

  check({ feed }, _ctx) {
    // `unknown`, never `down`: a feed that itself fails tells us nothing about
    // Supabase, and reporting that as an outage would be a lie.
    if (!feed) return { state: "unknown", message: "no feed supplied" };
    if (feed.error) return { state: "unknown", message: feed.error };

    if (feed.entries.length === 0) {
      return { state: "ok", message: "no entries in the status feed", ttlSeconds: 300 };
    }

    // `latest` is the fold to one entry per incident.
    const open = feed.latest.filter((e) => !RESOLVED.test(e.summary));
    if (open.length === 0) return { state: "ok", ttlSeconds: 300 };

    return {
      state: OPEN_STATE,
      message: open.map((e) => e.title).join("; "),
      ttlSeconds: 300,
    };
  },
};

export default service;
