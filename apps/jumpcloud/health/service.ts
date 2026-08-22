/**
 * Is JumpCloud up? — its Statuspage, read **per region**.
 *
 * The design point here is that "is JumpCloud up" has three different answers
 * at once. Verified 2026-08-18, `status.jumpcloud.com` publishes 140
 * components, and the ones that matter are region-suffixed:
 *
 *   "General Access API - US Region"     "General Access API - EU Region"
 *   "Commands - US Region"               "Commands - EU Region"
 *   "Groups (user/devices) - US Region"  "Groups (user/devices) - EU Region"
 *   … and the same again for India.
 *
 * A check that read the page's overall indicator would report an EU outage to a
 * US connection, and a US outage as the whole app being down. Since the region
 * lives on the Connection, this check is **`scope: "connection"` with
 * `credential: "context"`** — it needs the Connection to know *which* answer to
 * give, but not the credential to get it. That is exactly the posture the
 * three-way `CredentialPosture` exists for, and it is why the status host can
 * be declared in `network.allow`: an unsigned check may widen egress, a signed
 * one may not.
 *
 * The three components watched are the three this app's actions ride on: the
 * REST API itself, the command runner, and the group graph. The other 137 —
 * LDAP, RADIUS, SSO, MDM, the billing portal — are real JumpCloud services that
 * no action here touches, and an outage in one of them is not this app's
 * outage.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";
import { resolveRegion } from "../lib/client.ts";

const STATUS_HOST = "status.jumpcloud.com";

/** Region code -> the suffix JumpCloud's component names use. */
const REGION_LABEL: Record<string, string> = { us: "US", eu: "EU", in: "IN" };

/** The services this app's actions depend on, before the region suffix. */
const WATCHED = ["General Access API", "Commands", "Groups (user/devices)"];

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

const service: HealthCheckDefinition = {
  key: "service",
  title: "JumpCloud platform status",
  description:
    "The API, command and group components for THIS connection's region on JumpCloud's status " +
    "page. Reads the Connection for the region; sends no credential.",
  kind: "service",
  covers: ["*"],
  scope: "connection",
  credential: "context",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const region = resolveRegion(ctx.connection);
    const suffix = REGION_LABEL[region] ?? "US";
    const wanted = new Map(
      WATCHED.map((name) => [`${name} - ${suffix} Region`.toLowerCase(), name]),
    );

    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about JumpCloud.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as { components?: Component[] } | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    // `group: true` entries are the headings, whose status is a roll-up over
    // every region at once — exactly the conflation this check avoids.
    const matched = body.components.filter((c) =>
      c.group !== true && wanted.has(String(c.name).toLowerCase())
    );
    if (matched.length === 0) {
      return {
        state: "unknown",
        message: `the status page names no ${suffix} components this app watches`,
      };
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    for (const c of matched) {
      components[slug(String(c.name))] = {
        state: STATES[String(c.status)] ?? "unknown",
        message: c.status,
      };
    }

    const bad = matched.filter((c) => c.status !== "operational");
    return {
      state: worstHealthState(Object.values(components).map((c) => c.state)),
      message: bad.length === 0
        ? `${matched.length} ${suffix} components operational`
        : bad.map((c) => `${c.name}: ${c.status}`).join("; "),
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
