/**
 * Is Vertex AI up? — the **Google Cloud** status dashboard.
 *
 * Verified 2026-10-05:
 *
 *   GET https://status.cloud.google.com/products.json  -> 200, products incl.
 *       "Vertex Gemini API", "Vertex AI Online Prediction",
 *       "Vertex AI Batch Prediction" and "Vertex AI Model Registry"
 *   GET https://status.cloud.google.com/incidents.json -> 200, an incident feed
 *       with `service_name`, `affected_products[]`, `status_impact`, `begin`, `end`
 *
 * **Google is renaming these products.** `products.json` carries both a `title`
 * ("Vertex Gemini API") and a `current_title` ("Gemini on Agent Platform"), and
 * the same product can appear under either in an incident. Matching only the old
 * title would go quiet the day the feed switches; matching both costs nothing.
 *
 * Google publishes an incident *feed*, not a current-state rollup, so "up" is the
 * absence of an open incident: an entry with no `end` is still running.
 * `affected_products[]` is checked as well as `service_name`, because the broad
 * "Multiple Products" outages that matter most only name Vertex there.
 *
 * Only the products this app calls are matched. Vertex AI Search, Pipelines,
 * Training and the AutoML products are separate surfaces it never touches.
 *
 * Annotation: `kind: "service"`, `scope: "app"`, `credential: "none"` (unsigned);
 * the status host is not an API host, so it lives in the check's own
 * `network.allow`, not the app's.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "status.cloud.google.com";

/** Canonical product → every name Google has used for it. */
const PRODUCTS: Record<string, string[]> = {
  "Vertex Gemini API": ["Vertex Gemini API", "Gemini on Agent Platform"],
  "Vertex AI Online Prediction": [
    "Vertex AI Online Prediction",
    "Agent Platform Online Inference",
  ],
  "Vertex AI Batch Prediction": ["Vertex AI Batch Prediction", "Agent Platform Batch Inference"],
  "Vertex AI Model Registry": ["Vertex AI Model Registry", "Model Registry on Agent Platform"],
};

const IMPACT: Record<string, HealthState> = {
  SERVICE_OUTAGE: "down",
  SERVICE_DISRUPTION: "degraded",
  SERVICE_INFORMATION: "ok",
};

interface Incident {
  service_name?: string;
  status_impact?: string;
  external_desc?: string;
  end?: string;
  affected_products?: Array<{ title?: string; current_title?: string }>;
}

const norm = (s: string | undefined) => (s ?? "").trim().toLowerCase();
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const CANONICAL = new Map<string, string>();
for (const [canonical, names] of Object.entries(PRODUCTS)) {
  for (const n of names) CANONICAL.set(norm(n), canonical);
}

/** The canonical products an incident touches. */
function relevant(i: Incident): string[] {
  const names = [
    i.service_name,
    ...(i.affected_products ?? []).flatMap((p) => [p.title, p.current_title]),
  ];
  return [...new Set(names.map((n) => CANONICAL.get(norm(n))).filter((n): n is string => !!n))];
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Vertex AI platform status",
  description:
    "Open incidents for the Vertex AI products this app calls, on the Google Cloud status " +
    "dashboard. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/incidents.json`);
    // `unknown`, never `down`: a dashboard that itself fails tells us nothing about Google.
    if (!res.ok) return { state: "unknown", message: `status dashboard returned ${res.status}` };

    const body = await res.json().catch(() => null) as Incident[] | null;
    if (!Array.isArray(body)) {
      return { state: "unknown", message: "status dashboard returned an unexpected shape" };
    }

    const open = body.filter((i) => !i.end && relevant(i).length > 0);
    const components: Record<string, { state: HealthState }> = {};
    for (const name of Object.keys(PRODUCTS)) components[slug(name)] = { state: "ok" };
    for (const i of open) {
      const state = IMPACT[i.status_impact ?? ""] ?? "degraded";
      for (const name of relevant(i)) {
        components[slug(name)] = { state: worstHealthState([components[slug(name)].state, state]) };
      }
    }

    if (open.length === 0) return { state: "ok", components, ttlSeconds: 120 };

    return {
      state: worstHealthState(open.map((i) => IMPACT[i.status_impact ?? ""] ?? "degraded")),
      message: open.map((i) => i.external_desc).filter(Boolean).join("; ") || undefined,
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
