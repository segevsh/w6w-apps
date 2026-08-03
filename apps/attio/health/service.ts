/**
 * Is Attio up? — Atlassian Statuspage at `status.attio.com`.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — answers "is the vendor's platform up", a different
 *     question from "is this credential live" (the derived `auth:*` check) or
 *     "is there quota left" (`quota`, declared unavailable here).
 *   - `scope: "app"` (this kind's default) — the answer is identical for every
 *     Connection, so the host runs it once and shares it.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected, and
 *     a third-party status host never sees an Attio access token.
 *   - `network.allow` — `status.attio.com` is deliberately NOT on the app's
 *     egress allowlist; an action has no business calling it. The allowlist is
 *     widened for this one hook, which the spec permits precisely because the
 *     posture is unsigned.
 *   - `severity` is left at this kind's default of `degraded`. See "Why this one
 *     is not informational" below — it is a decision, not an omission.
 *
 * ## Verifying the status page is real, and is ACTUALLY ATTIO'S
 *
 * A JSON-shaped path returning 200 proves nothing on its own. Three independent
 * checks were run on 2026-08-03; the third is the one that catches the case the
 * first two miss.
 *
 * **(a) Bogus sibling path.** A catch-all answers everything with the same
 * bytes. This host does not:
 *
 *   - `GET /`                        -> 200, `text/html`, 168,237 B, md5 `1c22de96…`
 *   - `GET /this-page-does-not-exist-xyz` -> **404**, `text/html`, 41,475 B, md5 `1b78e1fd…`
 *   - `GET /summary.json` (wrong path) -> **404**, `text/html`, 41,442 B
 *
 * Different status, different length, different hash. Not a catch-all.
 *
 * **(b) Content-type and body.** The three real Statuspage endpoints all answer
 * with a JSON content-type and distinct, plausible sizes:
 *
 *   - `GET /api/v2/status.json`     -> 200, `application/json`, 200 B
 *   - `GET /api/v2/summary.json`    -> 200, `application/json`, 1,727 B
 *   - `GET /api/v2/components.json` -> 200, `application/json`, 1,529 B
 *
 * — while a `.json` path that does not exist returns **HTML**, which is exactly
 * the asymmetry a faked page cannot produce.
 *
 * **(c) Does the page describe THIS product?** The check that matters, because
 * (a) and (b) both pass on a claimed, healthy, correctly-routing Statuspage that
 * belongs to somebody else entirely. `status.json` self-identifies:
 *
 *     {"page":{"id":"01HHYYB6Q83W5764RVB4FXMHBF","name":"Attio",
 *              "url":"https://status.attio.com/","updated_at":"2025-06-24T08:49:32Z"},
 *      "status":{"description":"All Systems Operational","indicator":"none"}}
 *
 * `page.name` is "Attio"; `page.url` is on **Attio's own domain**, not a
 * `*.statuspage.io` subdomain someone else could have claimed. And the five
 * components are unmistakably this product, each with its own description:
 *
 *   | Component            | Description (verbatim)                                            |
 *   | -------------------- | ----------------------------------------------------------------- |
 *   | Customer Helpdesk    | "delivers our customer support chats and help documents"          |
 *   | Attio Cloud Storage  | "powers features such as files, enrichment and email attachments" |
 *   | Background Tasks     | "responsible for the background data processing"                  |
 *   | Attio Web Client     | "easy access to Attio from any web browser"                       |
 *   | **Attio Cloud**      | **"power our APIs and provide customers access to their data"**   |
 *
 * All five carry `created_at: 2023-12-18`, matching the page's own ULID-era id.
 *
 * ### The two decoys, both eliminated
 *
 *   - **`attio.statuspage.io`** redirects to `/inactive` (200, 26,345 B) — the
 *     decommissioned-page response. It is not the live page and is not probed.
 *   - **`attio.instatus.com`** redirects to `instatus.com` and serves the
 *     216,836-byte unclaimed-Instatus marketing page. Not Attio's.
 *
 * ## Why the state comes from ONE component, not the rollup indicator
 *
 * The obvious implementation reads `status.indicator` and maps
 * none/minor/major/critical. It is wrong here, and the component list is why.
 *
 * Three of the five — **Customer Helpdesk**, **Attio Web Client** and (mostly)
 * **Attio Cloud Storage** — are surfaces this app never touches. This app calls
 * `api.attio.com` and nothing else. A helpdesk outage or a web-client outage
 * moves the rollup indicator, and a check keyed on the rollup would report every
 * tenant's workflows as degraded over an incident that cannot affect a single
 * API call any of them make.
 *
 * So the reported `state` is derived from **Attio Cloud** specifically — the
 * component whose own description says it powers the APIs — and all five are
 * still reported in the `components` map so an operator sees the full picture.
 * This is the same narrowing `followupboss` and `circle` apply, and it is
 * preferable to the `discourse` route of dropping the whole check to
 * `informational`: there the mismatch is unfixable, here the vendor publishes
 * exactly the component we depend on.
 *
 * If that component ever disappears or is renamed, the check falls back to the
 * rollup indicator and says so in its message, rather than silently reporting
 * `unknown` forever.
 *
 * ## Why this one is NOT informational
 *
 * Having narrowed the signal to the component this app actually uses, the
 * default `degraded` severity is correct. Attio is pure multi-tenant SaaS: there
 * is no self-hosted edition and no per-tenant instance, so an outage of
 * `api.attio.com` affects **every** Connection without exception. Dropping to
 * `informational` would be hiding a real, universal outage.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/**
 * Statuspage's four rollup indicators, used only for the fallback path.
 *
 * `major` and `critical` map to `down` rather than `degraded`. The roll-up caps
 * the effect at `degraded` anyway (severity defaults to `degraded` for kind
 * `service`), so the distinction is what an operator reads, not what it gates.
 */
const INDICATOR: Record<string, HealthState> = {
  none: "ok",
  minor: "degraded",
  major: "down",
  critical: "down",
};

/** Statuspage's per-component vocabulary. */
const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

export const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const STATUS_HOST = "status.attio.com";

/**
 * The component whose state this check reports as its own.
 *
 * `slug("Attio Cloud")` — distinct from `attio-cloud-storage`, which is the
 * files/enrichment component and is reported but not keyed on.
 */
export const API_COMPONENT = "attio-cloud";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Attio platform status",
  description:
    "Atlassian Statuspage at status.attio.com. The reported state tracks the **Attio Cloud** " +
    "component specifically — the one Attio describes as powering its APIs, and the only surface " +
    "this app calls — while the web client, helpdesk, cloud storage and background tasks are " +
    "reported alongside it for context. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/summary.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      status?: { indicator?: string; description?: string };
      components?: Array<{ name?: string; status?: string; group?: boolean }>;
    };

    const components: Record<string, { state: HealthState }> = {};
    let apiState: HealthState | undefined;
    let apiStatus: string | undefined;
    for (const c of body.components ?? []) {
      // Skip group headers — they restate their children's worst state.
      if (!c.name || c.group) continue;
      const id = slug(c.name);
      const state = COMPONENT[c.status ?? ""] ?? "unknown";
      components[id] = { state };
      if (id === API_COMPONENT) {
        apiState = state;
        apiStatus = c.status;
      }
    }

    const rollup = body.status?.description;

    if (apiState === undefined) {
      // The component we key on is gone or renamed. Fall back to the rollup and
      // say so, rather than reporting a confident `unknown` that hides the
      // reason — a silent fallback would look identical to a healthy API.
      return {
        state: INDICATOR[body.status?.indicator ?? ""] ?? "unknown",
        message: `no "Attio Cloud" component on the status page; falling back to the overall ` +
          `rollup${rollup ? ` (${rollup})` : ""}`,
        components,
        ttlSeconds: 60,
      };
    }

    return {
      state: apiState,
      message: `Attio Cloud: ${apiStatus ?? "unknown"}${rollup ? ` · overall: ${rollup}` : ""}`,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
