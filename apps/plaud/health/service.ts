/**
 * Is the Plaud developer platform up?
 *
 * ## The status page, verified live on 2026-10-05
 *
 * `status.plaud.ai` is an Instatus page titled "Plaud Developer" — the developer
 * platform's own page (portal, SDK service, ASR service), not the consumer app's. It is
 * NOT Atlassian Statuspage. The paths that answer real JSON are Instatus's own:
 *
 *   | Path               | Body                                                                |
 *   | ------------------ | ------------------------------------------------------------------- |
 *   | `/summary.json`    | `{"page":{"name":"Plaud Developer","url":"…","status":"UP"}}`       |
 *   | `/v2/components.json` | `{"components":[{"id","name","status":"OPERATIONAL","group"}]}`  |
 *   | `/index.json`      | 404 (a Next.js page, not an endpoint)                               |
 *
 * `/components.json` is NOT served; the components live under `/v2/components.json`. Seven
 * components: Global Portal Service, SDK Service (US, JP) and ASR Service (US, JP). The ASR
 * Service is what the Transcription API runs on.
 *
 * Only `UP` and `OPERATIONAL` were seen on the wire. `HASISSUES` / `UNDERMAINTENANCE` and the
 * component outage values are Instatus's documented vocabulary; anything unrecognised reports
 * `unknown` rather than a guess.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_HOST = "status.plaud.ai";
export const SUMMARY_URL = `https://${STATUS_HOST}/summary.json`;
export const COMPONENTS_URL = `https://${STATUS_HOST}/v2/components.json`;
const PAGE_NAME = "Plaud Developer";

interface SummaryBody {
  page?: { name?: string; url?: string; status?: string };
}

interface ComponentsBody {
  components?: Array<
    { id?: string; name?: string; status?: string; group?: { name?: string } | null }
  >;
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
  title: "Plaud developer platform status",
  description: "Page-level status from status.plaud.ai (Instatus), with component detail.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(SUMMARY_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Plaud — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as SummaryBody | null;
    if (!body?.page) {
      return { state: "unknown", message: "Status page returned an unreadable body" };
    }
    if (body.page.name && body.page.name !== PAGE_NAME) {
      return { state: "unknown", message: "status page no longer self-identifies as Plaud's" };
    }

    const state = mapPageStatus(body.page.status);

    // Best-effort component detail — never fatal to the check.
    let components: Record<string, HealthComponentReport> | undefined;
    let note: string | undefined;
    try {
      const compRes = await ctx.fetch(COMPONENTS_URL, { headers: { accept: "application/json" } });
      if (compRes.ok) {
        const compBody = await compRes.json().catch(() => null) as ComponentsBody | null;
        const nodes = (compBody?.components ?? []).filter((c) => c?.id && c?.name);
        if (nodes.length > 0) {
          components = {};
          const affected: string[] = [];
          for (const node of nodes) {
            const label = node.group?.name ? `${node.group.name} ${node.name}` : node.name!;
            const compState = mapComponentStatus(node.status);
            components[node.id!] = compState === "ok"
              ? { state: compState, message: label }
              : { state: compState, message: `${label}: ${node.status}` };
            if (compState !== "ok") affected.push(`${label} (${node.status})`);
          }
          if (affected.length > 0) note = `affected: ${affected.join(", ")}`;
        }
      }
    } catch {
      // Enrichment only.
    }

    return {
      state,
      message: note ?? (body.page.status ? `page status: ${body.page.status}` : undefined),
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
