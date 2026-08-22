/**
 * Is Resend up? — declared absent, honestly.
 *
 * `status.resend.com` resolves and every path on it answers HTTP 200, which is
 * exactly what makes it dangerous: it is a client-rendered SPA behind a
 * catch-all route, not a status API. Probing any of these and parsing the
 * result would produce a check that is green during an outage. Verified
 * 2026-08-18 — every path returns the same ~147,643-byte HTML document, and the
 * first bytes of each are `<!DOCTYPE html>`:
 *
 *   GET https://status.resend.com/api/v2/status.json      -> 200, 147,643 B, HTML
 *   GET https://status.resend.com/api/v2/summary.json     -> 200, 147,643 B, HTML
 *   GET https://status.resend.com/api/v2/components.json  -> 200, 147,643 B, HTML
 *   GET https://status.resend.com/history.atom            -> 200, 147,686 B, HTML
 *   GET https://status.resend.com/history.rss             -> 200, 147,643 B, HTML
 *   GET https://status.resend.com/index.json              -> 200, 147,643 B, HTML
 *   GET https://status.resend.com/api/status              -> 200, 147,644 B, HTML
 *   GET https://resend.com/status                         -> 200, 147,687 B, HTML
 *
 * The standard Atlassian Statuspage paths are in that list and none of them is
 * real; the tiny size differences are a per-deploy id embedded in the same
 * shell. There is no Atom or RSS feed to declare either, so the spec's "declare
 * a feed, don't parse one" escape hatch does not apply.
 *
 * `severity: "informational"` is load-bearing here. An `unavailable` entry
 * always reports `unknown`, and `unknown` outranks `ok` in the roll-up — so at
 * any other severity, saying "this vendor publishes nothing machine-readable"
 * would pin the app's verdict at `unknown` permanently.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Resend platform status",
  description:
    "No machine-readable status API, Atom or RSS feed is published — status.resend.com is a " +
    "client-rendered page that answers 200 with the same HTML on every path.",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "status.resend.com serves an identical ~147 KB HTML SPA shell on every path tried, " +
      "including the standard Statuspage endpoints (/api/v2/status.json, summary.json, " +
      "components.json) and both feed paths (history.atom, history.rss) — verified " +
      "2026-08-18. A 200 there means the catch-all route matched, not that Resend is up, so " +
      "no probe can be built from it.",
  },
};

export default service;
