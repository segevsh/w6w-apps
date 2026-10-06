/**
 * Is Ironclad up?
 *
 * ## The status page is real, checked on 2026-10-06
 *
 * `status.ironcladapp.com` is an **incident.io**-hosted page (its RSS says
 * `<generator>incident.io</generator>`) and serves a Statuspage-v2-compatible JSON API:
 *
 *  - `GET /api/v2/summary.json` answers `{page, status, components}` — `page.name` is "Ironclad
 *    Contract Management", `page.url` is `https://status.ironcladapp.com/`, and `status.indicator`
 *    is the Atlassian vocabulary (`none` / `minor` / `major` / `critical`). Unlike some
 *    incident.io pages the `components` list is populated, and there is no `incidents` key at all.
 *  - `/feed.rss` and `/history.atom` carry the incident history, which names real Ironclad
 *    incidents ("Ironclad is down", "Email & Workflow Errors") — so the page describes this
 *    product, not a parent company's.
 *
 * ## What it does NOT say
 *
 * None of the 25 components is "API": they are product areas (Workflows, Repository, Editor,
 * Authentication, Authentication (OAuth 2.0), Service Availability) and third-party dependencies
 * (Google Cloud, mailgun, Box, AI). Several names appear more than once with nothing to tell
 * environments apart. So the check reports the **page-level indicator**, and lists any component
 * that is not `operational` in the message so a reader can judge relevance. It never reports
 * `down` from a component alone.
 *
 * `credential: "none"`: a status host must never see an Ironclad access token.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.ironcladapp.com/api/v2/summary.json";

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  status?: { indicator?: string; description?: string };
  components?: Array<{ name?: string; status?: string }>;
}

/** The Statuspage-v2 indicator vocabulary, observed as `none` on 2026-10-06. */
export function mapIndicator(indicator: string | undefined): HealthState {
  switch (indicator) {
    case "none":
      return "ok";
    case "minor":
      return "degraded";
    case "major":
    case "critical":
      return "down";
    default:
      return "unknown";
  }
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Ironclad platform status",
  description: "Page-level indicator from status.ironcladapp.com. The page has no API-specific " +
    "component, so non-operational components are listed for context only.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.ironcladapp.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Ironclad — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.ironcladapp\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Ironclad's" };
    }

    const state = mapIndicator(body.status?.indicator);
    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    const affected = (body.components ?? []).filter((c) => c.status && c.status !== "operational");
    if (affected.length > 0) {
      notes.push(
        `${affected.length} component(s) not operational: ${
          [...new Set(affected.map((c) => `${c.name} (${c.status})`))].join(", ")
        }`,
      );
    }
    return { state, message: notes.length > 0 ? notes.join("; ") : undefined, ttlSeconds: 60 };
  },
};

export default service;
