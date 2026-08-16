/**
 * Is tl;dv up?
 *
 * ## The status page is real, and it is Instatus
 *
 * tl;dv publishes at **`tldv.instatus.com`**. Checked three ways on 2026-08-16.
 *
 * **(a) Is the host a catch-all?** No.
 *
 *   | Path                            | Status  | Bytes  | Content type       |
 *   | -------------------------------- | ------- | ------ | ------------------ |
 *   | `/v2/components.json`           | 200     | 961    | `application/json` |
 *   | `/summary.json`                 | 200     | 73     | `application/json` |
 *   | `/definitely-not-real-zzz.json` | **404** | 7,001  | `text/html`        |
 *
 * Three different answers, and the nonsense path is refused with Instatus's
 * own 404 shell rather than a 200. `/v2/components.json` and `/summary.json`
 * are NOT byte-identical here (961 vs 73 bytes) — unlike some Instatus pages
 * in this pack, this one is not aliasing one path to the other, so reading the
 * richer endpoint is a real choice, not a coin flip.
 *
 * **(b) Is `tldv.statuspage.io` the real page instead?** No — it 302s to
 * `www.statuspage.io`, the marketing homepage, which is the standard signature
 * of an UNCLAIMED Statuspage subdomain. tl;dv never set one up there.
 *
 * **(c) Does the page describe THIS product?** Yes —
 * `{"page":{"name":"tl;dv","url":"https://tldv.instatus.com","status":"UP"}}`,
 * and its eight components are tl;dv's own: `WebApp`, three per-platform
 * "Assistant Recorder" bots (Google Meet, Zoom, Microsoft Teams), **`Public
 * API`**, `Webhooks & integrations`, `AI notes` and `AI reports`.
 *
 * ## Why `/v2/components.json` and not `/summary.json`
 *
 * `page.status` is one enum for tl;dv as a whole. This app calls exactly one
 * of the eight components — `Public API` — so folding a recorder-bot or
 * AI-notes outage into this app's verdict would be a false alarm, and (the
 * more dangerous direction) a `Public API` outage would be invisible behind a
 * green page-level rollup if the other seven are fine. The per-component
 * surface is the one that actually answers "is the surface this app calls
 * working".
 *
 * ## Annotation
 *
 *  - `kind: "service"` — separate from "is this key live" (the derived
 *    `auth:api-key` check) and from "is the API host itself answering" (`api`).
 *  - `scope: "app"` — tl;dv is SaaS-only, one shared host, so the answer is
 *    identical for every Connection.
 *  - `credential: "none"` — stated explicitly because it is the precondition
 *    for the `network` widening below. A status host must never see a tl;dv
 *    API key.
 *  - `severity` stays at the `degraded` default: there is no self-hosted
 *    tl;dv, so an incident here really is evidence about every Connection.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://tldv.instatus.com/v2/components.json";

/** The component whose health is this app's health. */
export const API_COMPONENT = "Public API";

/**
 * Instatus's per-component vocabulary. An unrecognised value is `unknown`
 * rather than assumed healthy — a vocabulary that grew is a thing to notice,
 * not to round down to `ok`.
 */
export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "OPERATIONAL":
      return "ok";
    case "DEGRADEDPERFORMANCE":
    case "PARTIALOUTAGE":
    case "MINOROUTAGE":
    case "UNDERMAINTENANCE":
      return "degraded";
    case "MAJOROUTAGE":
      return "down";
    default:
      return "unknown";
  }
}

interface InstatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: string | null;
  description?: string;
}

export const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Key by the vendor's stable id, falling back to a slug of the name. */
export function componentKey(component: InstatusComponent, index: number): string {
  if (component.id) return component.id;
  if (component.name) return `${slug(component.name)}-${index}`;
  return `component-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "tl;dv platform status",
  description:
    "Component status from tldv.instatus.com. The verdict follows the `Public API` component " +
    "alone — the surface every action here calls; the WebApp, recorder bots, webhooks and " +
    "AI-notes components are reported for attribution but never move it.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["tldv.instatus.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status page says nothing about tl;dv — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as
      | { components?: InstatusComponent[] }
      | null;
    if (!body || !Array.isArray(body.components)) {
      return { state: "unknown", message: "Status page returned no component list" };
    }

    const nodes = body.components.filter((c) => c?.name);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
      // The name goes in the message even when healthy: the key is an opaque
      // vendor id, so without it a reader cannot tell which component this is.
      components[componentKey(node, index)] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const api = nodes.find((n) => n.name === API_COMPONENT);
    if (!api) {
      // Renamed or regrouped. Say so rather than silently falling back to a
      // different component's answer, which is how a WebApp-only incident
      // starts failing every workflow.
      return {
        state: "unknown",
        message: `Status page no longer publishes a "${API_COMPONENT}" component ` +
          `(found: ${nodes.map((n) => n.name).join(", ")})`,
        components,
        ttlSeconds: 60,
      };
    }

    const state = mapComponentStatus(api.status);
    const others = nodes.filter((n) => n !== api && mapComponentStatus(n.status) !== "ok");

    const notes: string[] = [];
    if (state !== "ok") notes.push(`Public API: ${api.status}`);
    if (others.length > 0) {
      notes.push(
        `not affecting the API: ${others.map((n) => `${n.name} (${n.status})`).join(", ")}`,
      );
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
