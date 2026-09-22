/**
 * Is Firestore up? — the **Google Cloud** status dashboard.
 *
 * Picking the right Google status surface matters: this pack's nine Workspace
 * apps use `www.google.com/appsstatus`, and the ad products (e.g. Google Ads)
 * live on the advertising dashboard. Firestore is a Google Cloud product and
 * lives on neither. Verified on the wire 2026-09-22:
 *
 *   GET https://status.cloud.google.com/products.json  -> 200, 213 products,
 *       including `{"title": "Cloud Firestore", "id": "CETSkT92V21G6A1x28me"}`
 *   GET https://status.cloud.google.com/incidents.json -> 200, a JSON array of
 *       incidents carrying `service_name`, `affected_products[]` (each a
 *       `{title, id, current_title}`), `status_impact`, `begin`, `end`,
 *       `external_desc` and `uri`
 *
 * Google publishes an incident **feed** rather than a current-state rollup, so
 * "up" is the absence of an open incident: an entry with no `end` is still
 * running, and everything else in the file is history. The feed is the *Cloud*
 * one, so it is filtered to Cloud Firestore — a Cloud Run outage is not a
 * Firestore outage.
 *
 * A multi-product incident names each affected product in `affected_products[]`,
 * so both that list and `service_name` are checked. Matching only `service_name`
 * would miss exactly the broad outages that matter most.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — "is the vendor's platform up", a different question
 *     from "is this credential live" (the derived `auth:*` check).
 *   - `scope: "app"` (the default) — the answer is identical for every
 *     Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — unauthenticated and unsigned, so
 *     it reports even before anyone has connected.
 *   - `network.allow` — `status.cloud.google.com` is not the API host and is
 *     deliberately absent from the app's own egress allowlist. Widening egress
 *     for this one hook is permitted precisely because the posture is unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a Cloud incident never
 *     hard-fails a target on its own.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "status.cloud.google.com";

/** The product whose health is this app's health. */
const SERVICES = ["Cloud Firestore"];

/** Google's impact vocabulary, mapped onto our four states. */
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
  affected_products?: Array<{ title?: string }>;
}

const norm = (s: string | undefined) => (s ?? "").trim().toLowerCase();
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const WANTED = new Set(SERVICES.map(norm));

/** An incident touches this app if its service, or any affected product, is ours. */
function relevant(i: Incident): string[] {
  const names = [i.service_name, ...(i.affected_products ?? []).map((p) => p.title)];
  return names.filter((n) => WANTED.has(norm(n))).map((n) => n!.trim());
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Firestore platform status",
  description:
    "Open incidents for Cloud Firestore on the Google Cloud status dashboard — not the " +
    "Workspace or Ads one. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/incidents.json`);
    // `unknown`, never `down`: a dashboard that itself fails tells us nothing
    // about Google, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status dashboard returned ${res.status}` };

    const body = await res.json().catch(() => null) as Incident[] | null;
    if (!Array.isArray(body)) {
      return { state: "unknown", message: "status dashboard returned an unexpected shape" };
    }

    // No `end` means the incident is still running.
    const open = body.filter((i) => !i.end && relevant(i).length > 0);
    const components: Record<string, { state: HealthState }> = {};
    for (const name of SERVICES) components[slug(name)] = { state: "ok" };
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
