/**
 * Is Landbot up?
 *
 * `status.landbot.io` is an Atlassian Statuspage (checked 2026-10-06: `page.id` `x7zvlhcyj2mx`,
 * `page.name` `Landbot`, the `components` / `status.indicator` shape). It has no component named
 * for the API. The Platform API drives conversations, so the verdict reads the components this
 * app's actions actually touch:
 *
 *   - `Chats` (`7g64ghy9tqmt`) — the conversation engine; a major outage here is `down`.
 *   - the channel components `WhatsApp services`, `WhatsApp bots`, `landbots`, `Messenger bots`
 *     and the `Webhooks` integration — each is capped at `degraded`, since a dead channel does
 *     not stop the API from reading or sending on the others.
 *
 * `Builder`, `Zapier`, `Google Sheets`, `Metrics`, `AI Agents` and email notifications are
 * reported as detail and never move the state.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_HOST = "status.landbot.io";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;
export const PAGE_ID = "x7zvlhcyj2mx";
export const CHATS_ID = "7g64ghy9tqmt";
/** Components capped at `degraded`: channels and the webhook delivery path. */
export const CHANNEL_IDS = [
  "n6vnp7bk294m", // WhatsApp services
  "q45fhv3p0nrc", // WhatsApp bots
  "j88mdts9n0v7", // landbots
  "f7ql0tltpx48", // Messenger bots
  "3yybf9wv6nyq", // Webhooks
];

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string };
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
    case "major_outage":
      return "down";
    default:
      return "unknown";
  }
}

const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

const service: HealthCheckDefinition = {
  key: "service",
  title: "Landbot platform status",
  description:
    "Landbot's Statuspage: `Chats` decides down; the WhatsApp, Messenger, web-bot and Webhooks " +
    "components can degrade the verdict but never take it down. Other components are detail.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };
    if (body.page?.id !== PAGE_ID) {
      return { state: "unknown", message: "status page no longer self-identifies as Landbot's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    const chats = nodes.find((c) => c.id === CHATS_ID);
    if (!chats) {
      return { state: "unknown", message: "status page no longer publishes a `Chats` component" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      const state = mapComponentStatus(node.status);
      components[node.id ?? node.name!] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    }

    let state = mapComponentStatus(chats.status);
    const notes: string[] = [];
    if (state !== "ok") notes.push(`Chats: ${chats.status}`);
    for (const node of nodes.filter((n) => CHANNEL_IDS.includes(n.id ?? ""))) {
      const s = mapComponentStatus(node.status);
      if (s === "ok") continue;
      notes.push(`${node.name}: ${node.status}`);
      const capped: HealthState = s === "down" ? "degraded" : s;
      if (RANK[capped] > RANK[state]) state = capped;
    }
    const detail = nodes.filter((n) =>
      n.id !== CHATS_ID && !CHANNEL_IDS.includes(n.id ?? "") &&
      mapComponentStatus(n.status) !== "ok"
    );
    if (detail.length > 0) {
      notes.push(`other: ${detail.map((n) => `${n.name} (${n.status})`).join(", ")}`);
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
