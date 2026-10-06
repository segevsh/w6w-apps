/**
 * Is Twist up? — Instatus status page at `status.twist.io`.
 *
 * Verified 2026-10-06:
 *   - `status.twist.com` 302s to `status.twist.io`; `twist.statuspage.io` 302s to Statuspage's
 *     own marketing page (the unclaimed-decoy pattern). `status.doist.com` does not resolve, so
 *     Twist's page is NOT a Todoist rollup — it is Twist's own.
 *   - `/summary.json` answers `{"page":{"name":"Twist","url":"https://status.twist.io",
 *     "status":"UP"}}` — Instatus, not Atlassian (`/api/v2/summary.json` is an alias of the plain
 *     path, `/index.json` 404s, a bogus path 404s as HTML). `page.name` is read on every run.
 *   - `/components.json` lists two components: `Web application & API` (the one that covers
 *     `api.twist.com`) and `Website` (twist.com landing and help pages — NOT this API).
 *
 * The verdict comes from the API component alone, pinned by id with the name as a fallback. The
 * `Website` component is ignored, because a marketing-site incident says nothing about the API.
 * When the component cannot be found the page-level status is used, capped at `degraded`.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "status.twist.io";
const PAGE_NAME = "Twist";
const API_COMPONENT_ID = "cluqs85cl72335bjod1a9v8ra1";
const API_COMPONENT_NAME = "Web application & API";

const COMPONENT: Record<string, HealthState> = {
  OPERATIONAL: "ok",
  UNDERMAINTENANCE: "degraded",
  DEGRADEDPERFORMANCE: "degraded",
  MINOROUTAGE: "degraded",
  PARTIALOUTAGE: "degraded",
  MAJOROUTAGE: "down",
};

const PAGE: Record<string, HealthState> = {
  UP: "ok",
  HASISSUES: "degraded",
  UNDERMAINTENANCE: "degraded",
};

interface Component {
  id?: string;
  name?: string;
  status?: string;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Twist platform status",
  description:
    "Instatus feed for status.twist.io. Verdict from the `Web application & API` component only; " +
    "the `Website` component is ignored. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const summaryRes = await ctx.fetch(`https://${STATUS_HOST}/summary.json`);
    // `unknown`, never `down`: a status page that itself fails says nothing about Twist.
    if (!summaryRes.ok) {
      return { state: "unknown", message: `status API returned ${summaryRes.status}` };
    }
    const summary = await summaryRes.json().catch(() => undefined) as
      | { page?: { name?: string; status?: string } }
      | undefined;
    if (summary?.page?.name !== PAGE_NAME) {
      return {
        state: "unknown",
        message: `status page identified itself as "${summary?.page?.name}", not "${PAGE_NAME}"`,
      };
    }
    const pageState = PAGE[summary.page.status ?? ""] ?? "unknown";

    const compRes = await ctx.fetch(`https://${STATUS_HOST}/components.json`);
    const comps = compRes.ok
      ? ((await compRes.json().catch(() => undefined)) as { components?: Component[] } | undefined)
        ?.components
      : undefined;
    const api = comps?.find((c) => c.id === API_COMPONENT_ID) ??
      comps?.find((c) => c.name === API_COMPONENT_NAME);

    if (!api) {
      // Page-level fallback: cannot say the API specifically is down, so never worse than degraded.
      return {
        state: pageState === "down" ? "degraded" : pageState,
        message: "API component not found on the status page; reporting page-level status",
        ttlSeconds: 60,
      };
    }

    const state = COMPONENT[(api.status ?? "").toUpperCase()] ?? "degraded";
    return {
      state,
      message: state === "ok" ? undefined : `${api.name}: ${api.status}`,
      components: { "web-application-api": { state, message: api.status } },
      ttlSeconds: 60,
    };
  },
};

export default service;
