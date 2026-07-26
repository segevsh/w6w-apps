/**
 * Is Mistral up? — an RSS feed, which is the only machine-readable surface.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — this answers "is the vendor's platform up", which is a
 *     different question from "is this credential live" (the derived `auth:*`
 *     check).
 *   - `scope: "app"` (the default for this kind) — the answer is identical for
 *     every Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — status.mistral.ai is not on the app's egress allowlist
 *     and has no business being reachable from an action. Widening it for this
 *     one hook is permitted precisely because the posture is unsigned.
 *   - `severity` defaults to `degraded` for this kind.
 *
 * A caveat worth stating rather than hiding: Mistral's status page is
 * Checkly-hosted and exposes no JSON rollup, so there is no current-state
 * document to read — only a feed of announcements. This check therefore
 * INFERS state from the newest feed entry rather than reading it: an entry
 * published within the last day whose title does not say it is resolved is
 * treated as an open incident. That is a heuristic, and it is why the result
 * carries a short `ttlSeconds` and a message naming the entry it judged, so a
 * human can disagree with it.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const STATUS_HOST = "status.mistral.ai";
const RECENT_MS = 24 * 60 * 60 * 1000;

/** Pull the first `<tag>…</tag>` out of an RSS `<item>` block. */
function tag(block: string, name: string): string | undefined {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(block);
  if (!m) return undefined;
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Mistral platform status",
  description:
    "Newest entry from Mistral's status RSS feed. State is inferred from the entry, not read from a rollup — the vendor publishes no current-state document.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/feed.rss`);
    // `unknown`, never `down`: a feed that itself fails tells us nothing about
    // Mistral, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status feed returned ${res.status}` };

    const xml = await res.text();
    const first = /<item[^>]*>([\s\S]*?)<\/item>/i.exec(xml);
    // An empty feed means nothing has been announced, which is good news.
    if (!first) return { state: "ok", message: "no entries in the status feed", ttlSeconds: 300 };

    const block = first[1];
    const title = tag(block, "title") ?? "(untitled)";
    const published = Date.parse(tag(block, "pubDate") ?? "");
    if (Number.isNaN(published)) {
      return { state: "unknown", message: `could not date the newest entry: ${title}` };
    }

    const stale = Date.now() - published > RECENT_MS;
    const resolved = /\bresolved\b|\bcompleted\b/i.test(title);
    if (stale || resolved) {
      return { state: "ok", message: `newest entry: ${title}`, ttlSeconds: 300 };
    }

    return {
      state: "degraded",
      message: `open entry in the status feed: ${title}`,
      ttlSeconds: 300,
    };
  },
};

export default service;
