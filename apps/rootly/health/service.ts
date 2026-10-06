/**
 * Is the vendor up? — Rootly publishes nothing a host can read.
 *
 * Checked 2026-10-06: `status.rootly.com` is real (it is the page Rootly's own site and docs
 * link to), but it sits behind a Cloudflare managed challenge. Every path —
 * `/api/v2/summary.json`, `/index.json`, the root — answers `403` with an HTML "Just a
 * moment..." interstitial for a non-browser client, including with a browser User-Agent. A
 * server-side probe can therefore never read it, and an `unavailable` entry says so as a fact
 * instead of leaving a gap. (The alternative, a probe that treats the challenge page as `ok`,
 * would report a green light the vendor never gave.)
 *
 * `severity: "informational"`: an `unavailable` entry always reports `unknown`, which would
 * otherwise pin the app's verdict there permanently. Whether the API itself is answering is the
 * `api` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Vendor status",
  kind: "service",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "status.rootly.com is served behind a Cloudflare managed challenge: every path " +
      "(summary.json, index.json, the root) answers an HTML 403 interstitial to a non-browser " +
      "client, so no machine-readable status can be fetched.",
  },
};

export default service;
