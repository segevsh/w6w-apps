import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.certifier.io/api/status";

interface Monitor {
  name?: string;
  type?: string;
  description?: string;
  latestStatus?: boolean;
  latestCheckedAt?: string;
  uptimePercent?: number;
}

interface StatusBody {
  monitors?: Monitor[];
  operational?: boolean;
  hasData?: boolean;
}

export function monitorKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** `latestStatus` is a bare boolean: true = up, false = down, absent = no data. */
export function monitorState(m: Monitor): HealthState {
  if (m.latestStatus === true) return "ok";
  if (m.latestStatus === false) return "down";
  return "unknown";
}

/**
 * status.certifier.io is a custom page (not Statuspage, Instatus or Better
 * Stack: `/api/v2/summary.json`, `/index.json` and `/history.atom` all answer a
 * 38-byte JSON 404). Its own page script reads `GET /api/status`, which returns
 * `{ monitors: [{ name, type, latestStatus: boolean, uptimePercent, days }] }`
 * for six monitors: Certifier App, Issuer Portal, API, Database & Storage, Docs
 * and Help Center. Only the `API` monitor decides the verdict; the others are
 * reported as components, since a Help Center outage does not break a workflow.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Certifier status",
  description:
    "Monitor status from status.certifier.io. The API monitor decides the verdict; the app, " +
    "issuer portal, storage, docs and help-center monitors are shown as detail.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.certifier.io"] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "unknown", message: `could not reach the status page: ${String(err)}` };
    }
    if (!res.ok) {
      // A broken status page says nothing about Certifier — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as StatusBody | null;
    const monitors = (body?.monitors ?? []).filter((m) => m?.name);
    if (!body || monitors.length === 0) {
      return { state: "unknown", message: "Status page returned no monitors" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const m of monitors) {
      const state = monitorState(m);
      components[monitorKey(m.name!)] = state === "ok"
        ? { state, message: m.name }
        : { state, message: `${m.name}: ${state === "down" ? "down" : "no data"}` };
    }

    const api = monitors.find((m) => monitorKey(m.name!) === "api");
    if (!api) {
      return {
        state: "unknown",
        message: "Status page has no API monitor",
        components,
      };
    }
    const state = monitorState(api);
    const others = monitors.filter((m) => m !== api && monitorState(m) === "down");
    const notes: string[] = [];
    if (state !== "ok") notes.push(`API monitor ${state === "down" ? "is down" : "has no data"}`);
    if (others.length > 0) notes.push(`also down: ${others.map((m) => m.name).join(", ")}`);
    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
