/**
 * Is Drata's public API up — in THIS connection's region?
 *
 * ## The status page is real (checked 2026-10-05)
 *
 * `status.drata.com` is an Atlassian Statuspage:
 *
 *   - `/api/v2/summary.json` → 200, `application/json`, 8,928 bytes, `page.name` "Drata".
 *   - `/api/v2/definitely-not-real-zz.json` → **404**, 0 bytes (so not a catch-all).
 *   - `/history.atom` and `/index.json` also answer, with the same page id (`qsm43v3kr8mf`).
 *
 * It has 22 components, three of them regional groups (`US`, `EU`, `APAC`), each
 * holding `API <R>`, `Agent API <R>`, `Public API <R>`, `Auditor API <R>` and
 * `Incoming Webhooks <R>`. The names carry the region suffix, so they are unique
 * as plain strings. Because a US outage must not mark an EU connection down, the
 * check reads only this connection's own region.
 *
 * Watched: `Public API <R>` — the surface this app calls — and `API <R>`. The
 * Agent, Auditor and Webhook components are other products and are ignored.
 *
 * `credential: "context"` gives the hook the connection's region (display data)
 * without ever handing it the key, which is why a status host is safe to reach.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";
import { displayOf, parseRegion } from "../lib/client.ts";

export const STATUS_HOST = "status.drata.com";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;

const SUFFIX = { us: "US", eu: "EU", apac: "APAC" } as const;

const STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  under_maintenance: "degraded",
  major_outage: "down",
};

interface Component {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Drata public API status",
  description:
    "The `Public API` and `API` components of status.drata.com for THIS connection's region " +
    "(US, EU or APAC) — an outage in another region is not this connection's problem.",
  kind: "service",
  covers: ["*"],
  scope: "connection",
  credential: "context",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const region = parseRegion(displayOf(ctx.connection).region) ?? "us";
    const suffix = SUFFIX[region];

    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // `unknown`, never `down`: a status page that itself fails says nothing about Drata.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as
      | { page?: { name?: string }; components?: Component[] }
      | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    const wanted = new Set([`public api ${suffix}`, `api ${suffix}`].map((n) => n.toLowerCase()));
    const components: Record<string, { state: HealthState; message?: string }> = {};
    const states: HealthState[] = [];
    const bad: string[] = [];

    for (const c of body.components) {
      if (c.group === true) continue;
      const name = String(c.name ?? "");
      if (!wanted.has(name.toLowerCase())) continue;
      const state = STATES[String(c.status)] ?? "unknown";
      components[c.id ?? name] = state === "ok"
        ? { state, message: name }
        : { state, message: `${name}: ${c.status}` };
      states.push(state);
      if (c.status !== "operational") bad.push(`${name}: ${c.status}`);
    }

    if (states.length === 0) {
      return {
        state: "unknown",
        message: `the status page names no "Public API ${suffix}" or "API ${suffix}" component — ` +
          "it may have been reorganised",
      };
    }

    return {
      state: worstHealthState(states),
      message: bad.length === 0
        ? `${suffix} public API operational (${states.length} components)`
        : bad.join("; "),
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
