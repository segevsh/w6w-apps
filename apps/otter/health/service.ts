/**
 * Is Otter.ai up? — a real, claimed Atlassian Statuspage instance.
 *
 * Verified live 2026-09-29, three ways:
 *
 * **(a) `status.otter.ai` self-identifies as Otter's own page.**
 * `GET https://status.otter.ai/api/v2/summary.json` answers `200
 * application/json` with `page: { id: "01HNJQPD4DM0R7V037MC6RCS61", name:
 * "Otter.ai", url: "https://status.otter.ai/" }` — not an unclaimed
 * `*.statuspage.io` decoy (those serve a generic ~127 KB HTML shell, not a
 * page-named JSON body).
 *
 * **(b) One of its fifteen (flat, no groups) components is literally named
 * "Public API".** `id: 01KSR5PPJS6NWRE86QVNSFGBXH` — the exact surface this
 * app calls. The other fourteen cover the product broadly (Otter Website,
 * Otter Pilot, Payments, File Importing, Speech Processing, Otter Live Notes,
 * Web Recording (+ via Direct Messaging), Otter Chat, and upstream
 * Microsoft/Google auth dependencies listed twice each for different flows).
 *
 * **(c) A nonsense path on the same host still answers a shaped body**
 * (`/api/v2/status.json` — 200, 202 bytes, `{"page":{...},"status":{...}}`),
 * ruling out a catch-all SPA silently 200-ing everything.
 *
 * ## Annotation
 *
 *   - `kind: "service"` / `scope: "app"` / `credential: "none"` — a vendor
 *     status page answers identically for every Connection, and must never
 *     see a credential.
 *   - `network.allow` widens egress for this one hook only, to the status
 *     host — never `api.otter.ai`, the app's signed surface.
 *   - `severity` is left at the `degraded` default for `kind: "service"`, so
 *     a vendor incident never hard-fails a target on its own; the "Public
 *     API" component is surfaced by name in the message when it is not
 *     `operational`, so a reader does not have to guess which of the 15
 *     matters to this app.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

const STATUS_HOST = "status.otter.ai";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;

/** The one component this app actually depends on, by its stable vendor id. */
export const PUBLIC_API_COMPONENT_ID = "01KSR5PPJS6NWRE86QVNSFGBXH";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  status?: { indicator?: string; description?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
  scheduled_maintenances?: unknown[];
}

/** Statuspage's documented per-component vocabulary. */
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

/** The page-level roll-up: `none`, `minor`, `major`, `critical`, `maintenance`. */
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
  title: "Otter.ai platform status",
  description:
    "Component status from status.otter.ai, an Atlassian Statuspage. Highlights the 'Public " +
    "API' component specifically, alongside the vendor's own page-level roll-up.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // A broken status API says nothing about Otter — never `down`.
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect/rebrand silently pointing this probe at
    // someone else's claimed page.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.otter\.ai(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Otter's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      const key = node.id ?? node.name!;
      components[key] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const publicApi = nodes.find((n) => n.id === PUBLIC_API_COMPONENT_ID);
    const indicator = body.status?.indicator;
    const state = indicator === undefined
      ? mapComponentStatus(publicApi?.status)
      : mapIndicator(indicator);

    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    if (publicApi && mapComponentStatus(publicApi.status) !== "ok") {
      notes.push(`Public API: ${publicApi.status}`);
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
