/**
 * Is LaunchDarkly up? — its own Statuspage, read per-component.
 *
 * The design point is which components to read, and it is not obvious.
 * LaunchDarkly's status page publishes 39 leaf components, four of which have
 * "API" in the name — **and none of those four is the API this app calls.**
 * Verified 2026-08-18: "Server-side streaming API", "Client-side streaming
 * API", "Polling API" and "Edge API" are the *flag delivery network* that SDKs
 * connect to. Watching them would report an outage in something no action here
 * touches, and — worse — would stay green through an outage of the management
 * surface this app actually uses.
 *
 * So this reads the components the actions ride on: **Authentication** (every
 * call), **Flag targeting** (the flag reads and writes), **Segment
 * management**, **Account management** (projects, environments, members) and
 * **Audit log**.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — "is the vendor's platform up", a different question
 *     from "is this credential live" (the derived `auth:*` check).
 *   - `scope: "app"` (the default) — the answer is the same for every
 *     Connection, so the host runs it once and shares it.
 *   - `credential: "none"` (also the default) — unauthenticated and unsigned.
 *   - `network.allow` — `status.launchdarkly.com` is not an API host and is
 *     deliberately absent from the app's own egress allowlist.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "status.launchdarkly.com";

/**
 * The components this app's actions depend on. Deliberately excludes every
 * component with "API" in its name — those are the SDK-facing delivery
 * network, not the management API.
 */
const WATCHED = [
  "Authentication",
  "Flag targeting",
  "Segment management",
  "Account management",
  "Audit log",
];

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
  title: "LaunchDarkly platform status",
  description:
    "The management components this app calls — authentication, flag targeting, segments, " +
    "account and audit. Deliberately not the streaming and polling APIs, which are the SDK " +
    "delivery network.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about LaunchDarkly.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as { components?: Component[] } | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    // `group: true` entries are the headings, whose status rolls up components
    // this app does not use.
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
