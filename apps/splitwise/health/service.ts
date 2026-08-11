/**
 * Is Splitwise up?
 *
 * ## The status page is real, and it is Instatus — not Statuspage
 *
 * Splitwise publishes at **`status.splitwise.com`**, an **Instatus** page.
 * Checked three ways on 2026-08-11.
 *
 * **(a) Is the host a catch-all?** No.
 *
 *   | Path                            | Status  | Bytes   | Content type       |
 *   | ------------------------------- | ------- | ------- | ------------------ |
 *   | `/v2/components.json`           | 200     | 443     | `application/json` |
 *   | `/summary.json`                 | 200     | 80      | `application/json` |
 *   | `/definitely-not-real-zzz.json` | **404** | **7001**| `text/html`        |
 *   | `/index.json`                   | 404     | 7001    | `text/html`        |
 *   | `/status.json`                  | 404     | 7001    | `text/html`        |
 *
 * Three different answers, and the nonsense path is refused outright with the
 * Next.js 404 shell Instatus serves. `/index.json` — Better Stack's path, the
 * one Raindrop turned out to answer — and `/status.json` were both probed by
 * hand rather than ruled out by the page's look, and both 404.
 *
 * **(b) The Statuspage-shaped path is a trap here.**
 * `https://status.splitwise.com/api/v2/summary.json` answers **HTTP 200 with
 * `application/json`** — and is **byte-identical** to `/summary.json` (both md5
 * `1effababdc98…`, 80 bytes). It is an Instatus alias, not the Atlassian
 * schema. A check that assumed Statuspage because that path returned 200 JSON
 * would read `status.indicator`, find `undefined`, and report `unknown`
 * forever while the page said everything was fine. The body is:
 *
 *     {"page":{"name":"Splitwise","url":"https://status.splitwise.com",
 *              "status":"UP"}}
 *
 * **(c) Does the page describe THIS product?** Yes — `page.name` is
 * `"Splitwise"`, `page.url` is `https://status.splitwise.com`, and its three
 * components are `Website`, `API` and `Splitwise Pay`. Neither known
 * unclaimed-host signature matches: `splitwise.statuspage.io` *does* exist and
 * serves the 127,697-byte Atlassian marketing page (the known trap — measured
 * on the same day), which is precisely why the probe is not pointed there.
 *
 * ## Why `/v2/components.json` and not `/summary.json`
 *
 * `/summary.json` is smaller and more obvious, and it is the wrong read for two
 * reasons.
 *
 * First, `page.status` is one enum for the whole company. Splitwise's page
 * separates **API** from **Website** and **Splitwise Pay**, and only the first
 * is the surface every Action in this app calls. Folding a marketing-site
 * outage into this app's verdict is a false alarm; folding an API outage into a
 * verdict driven by a green page-level roll-up is the more dangerous direction.
 *
 * Second, this pack has already measured an Instatus page reporting
 * `page.status: "UP"` with an incident open and identified (see
 * `apps/manychat/health/service.ts`). The per-component surface is the one that
 * moved.
 *
 * ## `description` is not state — do not read it
 *
 * On 2026-08-11 all three components were `"status": "OPERATIONAL"` while two
 * of them carried `"description": "One of our upstream providers is having a
 * system outage"`. That field is a stale operator note left from a past
 * incident, not a live signal. Only `status` is read here.
 *
 * ## Annotation
 *
 *  - `kind: "service"` — "is the vendor up", separate from "is this key live"
 *    (the derived `auth:*` check) and from "is the API answering" (`api`).
 *  - `scope: "app"` — Splitwise is SaaS-only with one shared host, so the answer
 *    is identical for every Connection.
 *  - `credential: "none"` — stated rather than defaulted, because it is the
 *    precondition for the `network` widening below. A status host must never
 *    see a Splitwise API key, which *is* the account.
 *  - `severity` stays at the `degraded` default: there is no self-hosted
 *    Splitwise, so an incident here really is evidence about every Connection.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.splitwise.com/v2/components.json";

/** The component whose health is this app's health. */
export const API_COMPONENT = "API";

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
  /** Present but always `null` on this page; a grouped page would use it. */
  group?: string | null;
  /** A stale operator note. Deliberately not read — see the module doc. */
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
  title: "Splitwise platform status",
  description:
    "Component status from status.splitwise.com (Instatus). The verdict follows the `API` " +
    "component alone — the surface every action here calls; `Website` and `Splitwise Pay` are " +
    "reported for attribution but never move it.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.splitwise.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status page says nothing about Splitwise — never `down`.
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
      // different component's answer, which is how a website-only incident
      // starts failing every workflow.
      return {
        state: "unknown",
        message: `Status page no longer publishes an "${API_COMPONENT}" component ` +
          `(found: ${nodes.map((n) => n.name).join(", ")})`,
        components,
        ttlSeconds: 60,
      };
    }

    const state = mapComponentStatus(api.status);
    const others = nodes.filter((n) => n !== api && mapComponentStatus(n.status) !== "ok");

    const notes: string[] = [];
    if (state !== "ok") notes.push(`API: ${api.status}`);
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
