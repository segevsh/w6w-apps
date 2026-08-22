/**
 * Is Loops up? — its own Statuspage.
 *
 * Verified 2026-08-18: `status.loops.so/api/v2/status.json` answers 209 bytes
 * of `application/json` with page id `k5s3969jdp9t` and the name "Loops". That
 * check matters more than it looks — two of the five status surfaces probed
 * while building this batch returned HTTP 200 for *every* path because they
 * are single-page apps with a catch-all route, so "the JSON endpoint 200s" is
 * not evidence on its own. Loops' is a real Statuspage.
 *
 * The page publishes eight components under an "Email Sending" group. This
 * check reads the three this app's actions ride on — the API itself,
 * transactional sending and campaigns — and ignores the SMTP relay, the web
 * app and webhooks, which are real Loops services that no action here touches.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — "is the vendor's platform up", a different question
 *     from "is this credential live" (the derived `auth:*` check).
 *   - `scope: "app"` (the default) — the answer is identical for every
 *     Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — unauthenticated and unsigned.
 *   - `network.allow` — `status.loops.so` is not the API host and is
 *     deliberately absent from the app's own egress allowlist.
 *   - `severity` defaults to `degraded` for this kind, which is right: this is
 *     the check that is *supposed* to move the App's verdict.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "status.loops.so";

/** The components this app's actions actually ride on. */
const WATCHED = ["API", "Transactional", "Campaigns"];

/** Statuspage's component vocabulary, mapped onto our four states. */
const STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  under_maintenance: "degraded",
  major_outage: "down",
};

interface Component {
  name?: string;
  status?: string;
  group?: boolean;
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const WANTED = new Set(WATCHED.map((n) => n.toLowerCase()));

const service: HealthCheckDefinition = {
  key: "service",
  title: "Loops platform status",
  description:
    "The API, transactional and campaign components on Loops' own status page. Unauthenticated " +
    "and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about Loops.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as { components?: Component[] } | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    // `group: true` is the "Email Sending" heading, whose status is a roll-up
    // over components this app does not use.
    const watched = body.components.filter((c) =>
      c.group !== true && WANTED.has(String(c.name).toLowerCase())
    );
    if (watched.length === 0) {
      return {
        state: "unknown",
        message: "the status page no longer names the components this app watches",
      };
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    for (const c of watched) {
      components[slug(String(c.name))] = {
        state: STATES[String(c.status)] ?? "unknown",
        message: c.status,
      };
    }

    const bad = watched.filter((c) => c.status !== "operational");
    return {
      state: worstHealthState(Object.values(components).map((c) => c.state)),
      message: bad.length === 0
        ? `${watched.length} components operational`
        : bad.map((c) => `${c.name}: ${c.status}`).join("; "),
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
