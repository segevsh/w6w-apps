/**
 * Is Dropbox Sign up? — its own Statuspage, read per-component.
 *
 * Two things had to be checked before trusting this, and both changed the
 * design. Verified 2026-08-18:
 *
 * **1. It is not Dropbox's status page.** `status.dropbox.com` and
 * `status.hellosign.com` are different Statuspage instances with different page
 * ids (`t34htyd6jblf` vs `djw9397fmqd1`) and different components — the former
 * covers Dropbox file storage, the latter is titled "Dropbox Sign and Fax". The
 * pack's `dropbox` app watches the first; this app must watch the second.
 *
 * **2. The component group named "API" is not this app's API.** The page groups
 * nine components under Core / Web / API / Integrations, and the *only* member
 * of the API group is **"API callbacks from Dropbox Sign"** — outbound webhook
 * delivery, not the REST surface every action here calls. Watching the group
 * whose name matches would report green while sending was down. What this app
 * actually depends on sits in **Core** and **Web**.
 *
 * So the check reads named components rather than the page's overall indicator
 * or a group. The fax components ("Fax sending through Dropbox Fax", "Receive
 * faxes") are deliberately excluded — this app ships no fax action, so a fax
 * outage is not its outage — as are the Salesforce and HubSpot integration
 * components.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — "is the vendor's platform up", a different question
 *     from "is this credential live" (the derived `auth:*` checks).
 *   - `scope: "app"` (the default) — the answer is identical for every
 *     Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — unauthenticated and unsigned.
 *   - `network.allow` — `status.hellosign.com` is not an API host and is
 *     deliberately absent from the app's own egress allowlist.
 *   - `severity` defaults to `degraded` for this kind, which is right: this is
 *     the check that is *supposed* to move the App's verdict.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "status.hellosign.com";

/** The components this app's actions actually ride on. */
const WATCHED = [
  "Send signature requests",
  "Finished document delivery",
  "Document signing through Dropbox Sign and Fax",
  "Embedded signing through Dropbox Sign",
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
  title: "Dropbox Sign platform status",
  description:
    "The signing components on Dropbox Sign's own status page — not Dropbox's, and not the " +
    "component group named API, which covers outbound callbacks. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about Dropbox Sign.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as { components?: Component[] } | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    // `group: true` entries are the Core/Web/API/Integrations headings, whose
    // own status is a roll-up. Only leaf components are read.
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

    const states = Object.values(components).map((c) => c.state);
    const state = worstHealthState(states);
    const bad = watched.filter((c) => c.status !== "operational");
    return {
      state,
      message: bad.length === 0
        ? `${watched.length} components operational`
        : bad.map((c) => `${c.name}: ${c.status}`).join("; "),
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
