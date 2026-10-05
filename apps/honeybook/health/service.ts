/**
 * Is HoneyBook up?
 *
 * ## The status page is real, checked 2026-10-05
 *
 * `status.honeybook.com` is a **Better Stack** page (`<title>Better Stack`),
 * not Atlassian Statuspage. Unknown paths 301 to `/` (`/api/v2/summary.json`
 * included), so Statuspage idioms silently never fire here — the page's own
 * machine-readable index is **`/index.json`** (JSON:API, 35 KB):
 *
 *     "data": { "id": "174340", "type": "status_page",
 *               "attributes": { "company_name": "HoneyBook", "aggregate_state": "operational" } }
 *
 * plus eleven `status_page_resource` entries: System Access & Stability, CRM &
 * Project Management, Payments & Finances, Client Communication, Leads Capture,
 * Calendar & Scheduling, AI Features, Automations & Integrations, Files, Mobile
 * App, Notifications. `/feed.atom` serves RSS 2.0 incident updates
 * (`Status updates | HoneyBook`), but it is a log of reports, not a statement of
 * current state, so the resource states are the better signal.
 *
 * ## It does not name the API
 *
 * None of the eleven components is "API" — the nearest are "System Access &
 * Stability" and "CRM & Project Management". The page describes the product
 * the API fronts, not the API host, so a green here is weak evidence about
 * `api.honeybook.com`. That is why this check is `informational`: it can say
 * "HoneyBook reports an incident", but it must never pin a healthy connection
 * at `degraded`. `aggregate_state` is the vendor's own roll-up and is the
 * verdict; components are the detail.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_HOST = "status.honeybook.com";
export const STATUS_URL = `https://${STATUS_HOST}/index.json`;

export const STATE: Record<string, HealthState> = {
  operational: "ok",
  degraded: "degraded",
  downtime: "down",
  maintenance: "degraded",
};

export function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface StatusPayload {
  data?: { attributes?: { aggregate_state?: string; company_name?: string } };
  included?: Array<{
    type?: string;
    attributes?: { public_name?: string; status_page_resource_name?: string; status?: string };
  }>;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "HoneyBook platform status",
  description:
    "Better Stack status page for status.honeybook.com: the aggregate state plus a state per component. Unauthenticated and unsigned. The page has no API-specific component.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // `unknown`, never `down`: a failing status page says nothing about the vendor.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusPayload | null;
    if (!body) {
      return {
        state: "unknown",
        message:
          "status page did not return JSON — unknown paths on this host 301 to the HTML page",
      };
    }

    const attrs = body.data?.attributes;
    if (!(attrs?.company_name ?? "").toLowerCase().includes("honeybook")) {
      return { state: "unknown", message: "status page no longer self-identifies as HoneyBook's" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const entry of body.included ?? []) {
      if (entry.type !== "status_page_resource") continue;
      const name = entry.attributes?.public_name ?? entry.attributes?.status_page_resource_name;
      if (!name) continue;
      const raw = entry.attributes?.status ?? "";
      components[slug(name)] = {
        state: STATE[raw] ?? "unknown",
        message: `${name}: ${raw || "unknown"}`,
      };
    }
    if (Object.keys(components).length === 0) {
      return { state: "unknown", message: "status page returned no components" };
    }

    const aggregate = attrs?.aggregate_state;
    const affected = Object.values(components).filter((c) => c.state !== "ok");
    const notes: string[] = [];
    if (aggregate) notes.push(aggregate);
    if (affected.length > 0) notes.push(`affected: ${affected.map((c) => c.message).join(", ")}`);

    return {
      state: STATE[aggregate ?? ""] ?? "unknown",
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
