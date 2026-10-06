/**
 * Is KlickTipp up?
 *
 * ## The status page is real. Verified 2026-10-06
 *
 * KlickTipp publishes at **`klicktipp-status.com`** — `status.klicktipp.com`
 * answers 301 to it, and the runtime allowlists the URL it is given rather than
 * the redirect target, so the TRUE host is declared.
 *
 *   | Path                                   | Status  | Bytes | Content-Type       |
 *   | -------------------------------------- | ------- | ----- | ------------------ |
 *   | `/api/v2/summary.json`                 | 200     | 2,572 | `application/json` |
 *   | `/api/v2/definitely-not-real-zzz.json` | **404** | **0** | —                  |
 *
 * `page.name` is `"KlickTipp"` (page id `01K9VN704VAA3GSBB0GMM66GNE`, `page.url`
 * `https://klicktipp-status.com/`); the body is Statuspage-v2-shaped
 * (`page`, `status.indicator`, `components`) with ULID ids, not a catch-all page.
 *
 * ## It has a component for the API
 *
 * Its eleven components include one literally named **`API`**, plus **`Login`**
 * (which is what `/account/login` depends on) — alongside Website, App, Email
 * delivery, Link tracking, Bounce processing, CDN, Landingpages, AI-Services and
 * Support. The page-level indicator rolls all eleven up, so a Landingpages or
 * Support incident would mark the API degraded; the verdict here is therefore
 * the worst of `API` and `Login` only, and the rest are reported as detail.
 * If the page ever drops the `API` component the check falls back to the
 * indicator and says so in the message.
 *
 * `credential: "none"`: a status host must never see a KlickTipp session.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://klicktipp-status.com/api/v2/summary.json";
export const PAGE_ID = "01K9VN704VAA3GSBB0GMM66GNE";
/** The components the API verdict is taken from. */
export const API_COMPONENTS = ["API", "Login"];

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
  scheduled_maintenances?: unknown[];
  status?: { indicator?: string; description?: string };
}

export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
      return "ok";
    case "degraded_performance":
    case "partial_outage":
    case "under_maintenance":
      return "degraded";
    case "major_outage":
      return "down";
    default:
      return "unknown";
  }
}

export function mapIndicator(indicator: string | undefined): HealthState {
  switch (indicator) {
    case "none":
      return "ok";
    case "minor":
    case "major":
    case "maintenance":
      return "degraded";
    case "critical":
      return "down";
    default:
      return "unknown";
  }
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "KlickTipp platform status",
  description: "Component status from klicktipp-status.com. The verdict is the worse of the API " +
    "and Login components; website, app, email delivery, link tracking and the rest are " +
    "reported as detail.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["klicktipp-status.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about KlickTipp — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // The page must still say it is KlickTipp's, by name and by id.
    if (body.page?.name !== "KlickTipp" || (body.page.id && body.page.id !== PAGE_ID)) {
      return { state: "unknown", message: "status page no longer self-identifies as KlickTipp's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
      components[node.id ?? `component-${index}`] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const api = nodes.filter((n) => API_COMPONENTS.includes(n.name ?? ""));
    const hasApi = api.some((n) => n.name === "API");
    const state = hasApi
      ? worstHealthState(api.map((n) => mapComponentStatus(n.status)))
      : mapIndicator(body.status?.indicator);

    const notes: string[] = [];
    if (!hasApi) notes.push("no API component on the page; using the page-level indicator");
    if (body.status?.description) notes.push(body.status.description);
    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    const openIncidents = body.incidents?.length ?? 0;
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
