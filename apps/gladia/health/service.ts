/**
 * Is Gladia up? — status.gladia.io, an incident.io page serving a Statuspage-compatible
 * document.
 *
 * Verified live 2026-10-06: `/api/v2/summary.json` answers 200 with `page.name` "Gladia"
 * (id `01KCHE98EAVNWW65E2XPEW9KEA`), a `status.indicator` and seven flat components —
 * Website, Playground, API, Add-ons, Pre-Recorded v2, Real-Time v1, Real-Time v2.
 * `/index.json` is a 404 (this is not Better Stack). The page is a real one (linked from
 * Gladia's own site), not a catch-all.
 *
 * This app only calls the pre-recorded API, so the page's top-level indicator is NOT the
 * verdict — a Real-Time outage must not mark it down. `API` and `Pre-Recorded v2` decide;
 * the other components are reported as detail, capped at `degraded` (Add-ons only affects
 * optional features; the Website and Playground are not the API).
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_HOST = "status.gladia.io";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;
export const PAGE_ID = "01KCHE98EAVNWW65E2XPEW9KEA";

/** Components whose state is this app's verdict. */
const DECIDING = new Set(["API", "Pre-Recorded v2"]);

const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface Summary {
  page?: { id?: string; name?: string };
  status?: { indicator?: string; description?: string };
  components?: Array<{ name?: string; status?: string; group?: boolean }>;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Gladia platform status",
  description:
    "status.gladia.io (Statuspage-compatible). The `API` and `Pre-Recorded v2` components decide; " +
    "Real-Time, Website, Playground and Add-ons are detail capped at degraded.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "unknown", message: `could not reach the status page: ${String(err)}` };
    }
    // `unknown`, never `down`: a failing status page says nothing about the vendor.
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "unknown", message: `status API returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as Summary | null;
    if (!body?.status || !Array.isArray(body.components)) {
      return { state: "unknown", message: "status page did not return a Statuspage summary" };
    }
    if (body.page?.id !== PAGE_ID || body.page?.name !== "Gladia") {
      return {
        state: "unknown",
        message: `status page is not Gladia's (id ${body.page?.id}, name "${body.page?.name}")`,
      };
    }

    const components: Record<string, HealthComponentReport> = {};
    let verdict: HealthState = "ok";
    let seen = 0;
    for (const c of body.components) {
      if (!c.name || c.group) continue;
      const raw = COMPONENT[c.status ?? ""] ?? "unknown";
      if (DECIDING.has(c.name)) {
        seen++;
        if (RANK[raw] > RANK[verdict]) verdict = raw;
        components[slug(c.name)] = { state: raw };
      } else {
        components[slug(c.name)] = { state: raw === "down" ? "degraded" : raw };
      }
    }
    if (seen === 0) {
      return { state: "unknown", message: "no API component on the status page", components };
    }
    return { state: verdict, message: body.status.description, components, ttlSeconds: 60 };
  },
};

export default service;
