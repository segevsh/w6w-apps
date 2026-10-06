/**
 * Is MailerSend up? — `status.mailersend.com`.
 *
 * ## The page is real, and it is an incident.io one
 *
 * Verified on 2026-10-06:
 *
 *  - `GET /api/v2/summary.json` answers 200 with `{ page, status, components }` (no
 *    `incidents` or `scheduled_maintenances` keys at all, so every access is optional).
 *  - `page.name` is "MailerSend", `page.id` is `01KHV8MXEE2KYXQQVB9VR9D5BA`. The id is
 *    pinned: a rebrand, redirect or hijack that points this probe at someone else's page
 *    reads `unknown`, not a green light.
 *  - The response headers carry the `incident-io` page CSP, ULID ids, and no Atlassian
 *    markers — it implements the Statuspage v2 SHAPE, not Statuspage.
 *
 * ## Which components decide
 *
 * Ten components are published. The app calls the sending API, the bulk endpoint and the
 * management endpoints, so the WORST of those three decides:
 *
 *   - `Email sending API`  (01KHV8MXEEH5TZCJNAJT34VNFT) — `POST /v1/email`
 *   - `Bulk endpoint`      (01KHV8MXEE3EXZW98Y8RKS40WF) — `POST /v1/bulk-email`
 *   - `MailerSend APP`     (01KHV8MXEEQ0QJ63NPENMK8NWC) — "domains, activity, analytics,
 *     users, API tokens, SMS and email verification", i.e. every other endpoint here
 *
 * The rest (Website, Inbound routing, SMTP, Deliverability rate, Delivery time, Email
 * analytics, Email activity) are listed as detail and never move the verdict: the
 * deliverability and delivery-time rows are fleet-wide averages, not API availability,
 * and SMTP is a different door. If none of the three can be found (renamed), the
 * page-level indicator decides instead.
 *
 * `credential: "none"` and a per-hook `network.allow` keep the status host out of the
 * app's own egress allowlist: no action has any business calling it.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

const STATUS_HOST = "status.mailersend.com";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;
export const PAGE_ID = "01KHV8MXEE2KYXQQVB9VR9D5BA";

/** Component ids that decide the verdict, with the names to fall back on. */
export const DECIDING = [
  { id: "01KHV8MXEEH5TZCJNAJT34VNFT", name: "Email sending API" },
  { id: "01KHV8MXEE3EXZW98Y8RKS40WF", name: "Bulk endpoint" },
  { id: "01KHV8MXEEQ0QJ63NPENMK8NWC", name: "MailerSend APP" },
];

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string };
  status?: { indicator?: string; description?: string };
  components?: StatusComponent[];
}

export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
      return "ok";
    case "degraded_performance":
    case "partial_outage":
    case "under_maintenance":
      return "degraded";
    case "full_outage":
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

const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };
const worst = (states: HealthState[]): HealthState =>
  states.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), "ok" as HealthState);

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "MailerSend platform status",
  description:
    "From status.mailersend.com (incident.io, Statuspage v2 shape). The worst of `Email sending API`, `Bulk endpoint` and `MailerSend APP` decides; the other components are shown as detail.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    // `unknown`, never `down`: a status page that itself fails says nothing about the vendor.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "status page returned an unreadable body" };

    if (body.page?.id !== PAGE_ID) {
      return {
        state: "unknown",
        message: `status page is no longer the pinned MailerSend page (id ${
          body.page?.id ?? "missing"
        }, name "${body.page?.name ?? ""}")`,
      };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      components[slug(node.name!)] = state === "ok"
        ? { state }
        : { state, message: `${node.name}: ${node.status}` };
    }

    const deciding = DECIDING.map((d) =>
      nodes.find((n) => n.id === d.id) ?? nodes.find((n) => n.name === d.name)
    ).filter((n): n is StatusComponent => n !== undefined);

    const state = deciding.length > 0
      ? worst(deciding.map((n) => mapComponentStatus(n.status)))
      : mapIndicator(body.status?.indicator);

    const affected = deciding.filter((n) => mapComponentStatus(n.status) !== "ok");
    const message = affected.length > 0
      ? `affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`
      : deciding.length === 0
      ? "none of the API components are published; using the page indicator"
      : body.status?.description;

    return { state, message, components, ttlSeconds: 60 };
  },
};

export default service;
