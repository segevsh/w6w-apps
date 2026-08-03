import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Odoo publishes a status page, but nothing a machine can read — so this
 * declares the absence as a positive fact rather than leaving a host to
 * conclude the publisher forgot.
 *
 * ## How that conclusion was reached, because "there's a status page" looks
 * ## like there should be an API
 *
 * `https://status.odoo.com/` is a client-rendered single-page app. Probed on
 * 2026-08-03, it serves the SAME 34,068-byte HTML document for every path — the
 * conventional Atlassian Statuspage endpoints, the conventional feed paths, and
 * deliberately invented ones alike:
 *
 *   - `GET /api/v2/status.json`   -> 200, **text/html**, 34068 bytes
 *   - `GET /api/v2/summary.json`  -> 200, **text/html**, 34068 bytes
 *   - `GET /history.rss`          -> 200, **text/html**, 34068 bytes
 *   - `GET /history.atom`         -> 200, **text/html**, 34068 bytes
 *   - `GET /api/v2/w6w-bogus-does-not-exist.json` -> 200, text/html, 34068 bytes
 *   - `GET /totally-fake-path-xyz`                -> 200, text/html, 34068 bytes
 *
 * The bodies are byte-identical (md5 `9322b33d…` for both the real page and the
 * "status.json"), and the document references no API host of its own — the only
 * absolute URLs in it are a CDN logo, Google Fonts, and four www.odoo.com
 * marketing links. So there is no JSON status API and no Atom/RSS feed here;
 * there is an HTML catch-all that answers 200 to anything.
 *
 * This is precisely the trap a naive `service` check falls into: probing
 * `/api/v2/status.json`, getting a 200, and reporting a permanently cheerful
 * status derived from parsing marketing HTML. Two independent checks were used
 * to catch it — a deliberately bogus sibling path, and content-type/body
 * inspection — because the bogus-path check ALONE would not have been enough
 * either, given this host answers 200 to that too.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity this declared absence would pin every verdict at `unknown` forever.
 *
 * The useful signal for this app is `instance` anyway: an Odoo deployment's
 * health is a property of that deployment, not of odoo.com.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Odoo platform status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Odoo publishes status.odoo.com as a client-rendered page with no machine-readable " +
      "surface: every path — including the conventional Statuspage JSON endpoints, RSS/Atom " +
      "feeds, and deliberately invented ones — returns the same 34 KB HTML shell as text/html " +
      "(verified 2026-08-03). Use the `instance` check, which probes this connection's own Odoo " +
      "server and is the health signal that actually governs whether calls succeed.",
  },
};

export default service;
