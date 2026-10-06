/**
 * seven publishes its own status page at status.seven.io (a Next.js app, not Statuspage or
 * Instatus: `/api/v2/summary.json`, `/summary.json` and `/index.json` all answer a 404 HTML
 * page). Its `/history.atom` is a real Atom feed, measured 2026-10-06: 50 incident entries,
 * each a distinct `<id>`, whose plain-text summary opens with
 *
 *   Status: resolved
 *   Impact: critical
 *   Affected: Voice, HTTP Api, SMS Delivery, ...
 *
 * so this declares the feed with `feed` and reads those three lines. Only an entry whose status
 * is not `resolved` counts as open, and only if it names a component this app reaches (the
 * HTTP API, SMS and RCS delivery, inbound SMS, Voice, and the HLR / MNP / CNAM / Format lookups).
 * Webapp, SMPP, Email-to-SMS and the Slack / Shopify / Bitrix24 integrations are other surfaces
 * and never drive the verdict. An open entry with `Impact: none` is announced work, not a fault.
 * An open incident is `degraded`, never `down`: the feed has no per-component state.
 */
import type { HealthCheckDefinition } from "@w6w/types";

export const RELEVANT = [
  "http api",
  "sms delivery",
  "rcs delivery",
  "inbound sms",
  "voice",
  "hlr",
  "mnp",
  "cnam",
  "format",
];

export function field(summary: string, name: string): string | undefined {
  const m = new RegExp(`^\\s*${name}:\\s*(.+)$`, "im").exec(summary);
  return m ? m[1].trim() : undefined;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "seven platform status",
  description:
    "Reads status.seven.io's Atom history feed for open incidents that name an API-reachable " +
    "component.",
  kind: "service",
  covers: ["*"],
  feed: { url: "https://status.seven.io/history.atom", format: "atom" },
  minIntervalSeconds: 300,

  check({ feed }) {
    if (feed?.error) return { state: "unknown", message: feed.error };
    const open = (feed?.latest ?? []).filter((e) => {
      const status = (field(e.summary, "status") ?? "").toLowerCase();
      if (status === "" || status === "resolved") return false;
      if ((field(e.summary, "impact") ?? "").toLowerCase() === "none") return false;
      const affected = field(e.summary, "affected");
      if (!affected) return true;
      return affected.split(",").some((c) => RELEVANT.includes(c.trim().toLowerCase()));
    });
    if (open.length === 0) return { state: "ok", ttlSeconds: 300 };
    return {
      state: "degraded",
      message: open.slice(0, 5).map((e) => e.title).join("; "),
      ttlSeconds: 300,
    };
  },
};

export default service;
