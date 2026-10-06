import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is Podium's public API up?
 *
 * `status.podium.com` is an **Instatus** page (verified 2026-10-06: `summary.json` answers
 * `{"page":{"name":"Podium","url":"https://status.podium.com","status":"UP"}}`, and
 * `/v2/components.json` lists sixteen components, one of them `Public API`; a bogus path is a
 * 404). It is NOT Atlassian Statuspage — `/api/v2/summary.json` has a different shape, so the
 * Statuspage idiom would silently never fire.
 *
 * The verdict comes from the `Public API` component, not the page roll-up: the roll-up also
 * covers Web Application, Mobile, Webchat, Phones, LeadDrive and Marketplace, none of which this
 * app calls. Every other component is reported for attribution. If `Public API` is renamed or
 * removed the check falls back to the page status, loudly.
 *
 * `credential: "none"` — a third-party status host must never see an access token.
 */
export const STATUS_HOST = "status.podium.com";
export const SUMMARY_URL = `https://${STATUS_HOST}/summary.json`;
export const COMPONENTS_URL = `https://${STATUS_HOST}/v2/components.json`;
export const API_COMPONENT_NAME = "Public API";

interface SummaryBody {
  page?: { name?: string; url?: string; status?: string };
}

interface ComponentsBody {
  components?: Array<{ id?: string; name?: string; status?: string }>;
}

export function mapPageStatus(status: string | undefined): HealthState {
  switch (status) {
    case "UP":
      return "ok";
    case "UNDERMAINTENANCE":
    case "HASISSUES":
      return "degraded";
    default:
      return "unknown";
  }
}

export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "OPERATIONAL":
      return "ok";
    case "UNDERMAINTENANCE":
    case "DEGRADEDPERFORMANCE":
    case "PARTIALOUTAGE":
      return "degraded";
    case "MAJOROUTAGE":
      return "down";
    default:
      return "unknown";
  }
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Podium platform status",
  description:
    "Instatus feed for status.podium.com. The verdict tracks the `Public API` component — the " +
    "surface every action calls — not the page roll-up, which also covers the web app, mobile, " +
    "webchat and phones. Other components are reported for attribution only.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(SUMMARY_URL, { headers: { accept: "application/json" } });
    // A broken status feed says nothing about Podium — never `down`.
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as SummaryBody | null;
    if (!body?.page) {
      return { state: "unknown", message: "Status page returned an unreadable body" };
    }
    if (body.page.name && body.page.name !== "Podium") {
      return { state: "unknown", message: "status page no longer self-identifies as Podium's" };
    }

    const pageState = mapPageStatus(body.page.status);
    let components: Record<string, HealthComponentReport> | undefined;
    let state = pageState;
    const notes: string[] = [];
    try {
      const compRes = await ctx.fetch(COMPONENTS_URL, { headers: { accept: "application/json" } });
      const compBody = compRes.ok
        ? await compRes.json().catch(() => null) as ComponentsBody | null
        : null;
      const nodes = (compBody?.components ?? []).filter((c) => c?.id && c?.name);
      if (nodes.length > 0) {
        components = {};
        const affected: string[] = [];
        for (const node of nodes) {
          const s = mapComponentStatus(node.status);
          components[node.id!] = s === "ok"
            ? { state: s, message: node.name }
            : { state: s, message: `${node.name}: ${node.status}` };
          if (s !== "ok") affected.push(`${node.name} (${node.status})`);
        }
        const api = nodes.find((c) => c.name === API_COMPONENT_NAME);
        if (api) {
          state = mapComponentStatus(api.status);
          if (pageState !== "ok") notes.push(`page status: ${body.page.status}`);
        } else {
          notes.push(
            `no \`${API_COMPONENT_NAME}\` component on the status page — using the page-wide status`,
          );
        }
        if (affected.length > 0) notes.push(`affected: ${affected.join(", ")}`);
      }
    } catch {
      // Component detail is enrichment only; the page-level verdict stands.
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
