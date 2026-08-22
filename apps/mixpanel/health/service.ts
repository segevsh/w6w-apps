/**
 * Is Mixpanel up **for this project's region**, and for the capability being
 * used?
 *
 * Mixpanel's status page is partitioned twice over — by region *and* by
 * capability — which happens to line up exactly with how this app is split.
 * Verified 2026-08-18 it publishes `Application Availability (US|EU|IN)`,
 * `Ingestion API Availability (US|EU|IN)`, and the global `Data Export`,
 * `Warehouse Connectors` and `JavaScript Library CDN`.
 *
 * Three of those matter here, and each covers a different part of the app:
 *
 *   - **Application** — every `/api/query/*` action. Down, the reports fail.
 *   - **Ingestion** — `event-import` and the profile writes. Down, nothing can
 *     be written; queries are unaffected.
 *   - **Data Export** — `event-export` alone, which runs on its own hosts and
 *     its own rate budget.
 *
 * Because those fail independently, one being out is **`degraded`**, not
 * `down`: a workflow that only queries is unharmed by an ingestion outage, and
 * one that only writes is unharmed by an application outage. `down` is reserved
 * for the case where both of the region's own components are out, which is what
 * "Mixpanel is down for us" actually means.
 *
 * The check is **connection-scoped** because the region is on the credential —
 * an EU project has no stake in a US outage.
 *
 * Annotation:
 *
 *   - `kind: "service"` — "is the vendor up", separate from "is this service
 *     account live" (the derived `auth:service-account` check).
 *   - `credential: "context"` — it reads the Connection's region and nothing
 *     else; the status host must never see a credential.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { displayOf, normalizeRegion } from "../lib/client.ts";

const STATUS_HOST = "www.mixpanelstatus.com";

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

const service: HealthCheckDefinition = {
  key: "service",
  title: "Mixpanel platform status",
  description:
    "This project's region, split by capability: querying, ingestion and raw export fail " +
    "independently, so one being out is degraded rather than down.",
  kind: "service",
  covers: ["*"],
  scope: "connection",
  credential: "context",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const region = normalizeRegion(displayOf(ctx.connection).region).toUpperCase();

    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about Mixpanel.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as { components?: Component[] } | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    const find = (name: string) =>
      body.components!.find((c) => c.group !== true && String(c.name).toLowerCase() === name);

    const wanted: Array<[string, string]> = [
      ["query", `application availability (${region.toLowerCase()})`],
      ["ingestion", `ingestion api availability (${region.toLowerCase()})`],
      ["export", "data export"],
    ];

    const components: Record<string, { state: HealthState; message?: string }> = {};
    const bad: string[] = [];
    for (const [id, name] of wanted) {
      const c = find(name);
      if (!c) continue;
      const state = STATES[String(c.status)] ?? "unknown";
      components[id] = { state, message: `${c.name}: ${c.status}` };
      if (c.status !== "operational") bad.push(`${c.name}: ${c.status}`);
    }

    if (Object.keys(components).length === 0) {
      return {
        state: "unknown",
        message: `the status page names no components for the ${region} region`,
      };
    }

    // Only a region whose querying AND ingestion are both out counts as down;
    // a single capability failing leaves the rest of the app working.
    const regional = [components.query?.state, components.ingestion?.state].filter(Boolean);
    const bothDown = regional.length === 2 && regional.every((s) => s === "down");
    const anyTrouble = Object.values(components).some((c) => c.state !== "ok");

    return {
      state: bothDown ? "down" : anyTrouble ? "degraded" : "ok",
      message: bad.length === 0 ? `${region} region operational` : bad.join("; "),
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
