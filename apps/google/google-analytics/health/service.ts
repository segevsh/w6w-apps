/**
 * Is Google Analytics up? — the **Google Ads Status Dashboard**, not the
 * Workspace one.
 *
 * This is the same trap this pack's `google-ads` app documents, and it catches
 * `google-analytics` from the other direction: nine of the ten `google-*` apps
 * here probe `www.google.com/appsstatus/dashboard/incidents.json`, and reusing
 * that would look consistent and be wrong. Verified live 2026-08-18, in both
 * directions:
 *
 *   - `https://www.google.com/appsstatus/dashboard/products.json` lists 37
 *     Workspace products (Gmail, Drive, Docs, Sheets, Chat, …) and **contains
 *     no Analytics entry at all**.
 *   - `https://ads.google.com/status/publisher/products.json` lists 16 products
 *     and **"Google Analytics" is one of them**, alongside Google Ads, the
 *     Google Ads API, Campaign Manager 360 and Display & Video 360.
 *
 * So GA lives on the advertising dashboard, and the incident feed beside it at
 * `https://ads.google.com/status/publisher/incidents.json` is what this probes.
 *
 * Two feed quirks that would otherwise produce wrong verdicts, both inherited
 * from the sibling app's observations of live data and handled below:
 *
 *   - `service_name` values arrive with a **leading space** (`" AdMob"`), so
 *     matching is trimmed and case-insensitive.
 *   - a multi-product incident carries the literal `service_name`
 *     `"Multiple Products"` and names the real ones in `affected_products[]`,
 *     so both are checked. Matching only `service_name` would miss exactly the
 *     broad outages that matter most.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — "is the vendor's platform up", a different question
 *     from "is this credential live" (the derived `auth:*` check).
 *   - `scope: "app"` (the default for this kind) — the answer is identical for
 *     every Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports before anyone has connected. It also
 *     means the dashboard host is never reached with a credential attached.
 *   - `network.allow` — `ads.google.com` is neither of this app's API hosts and
 *     is deliberately absent from its egress allowlist; an action has no
 *     business reaching it. Widening it for this one hook is permitted
 *     precisely because the posture is unsigned.
 *   - `severity` defaults to `degraded` for this kind, so an incident never
 *     hard-fails a target on its own.
 *
 * Google publishes an incident *feed* rather than a current-state rollup, so
 * "up" is the absence of an open incident: an entry with no `end` is still
 * running, and everything else in the file is history.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "ads.google.com";

/** Products whose health is this app's health. */
const SERVICES = ["Google Analytics"];

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

/** An incident touches this app if its service, or any affected product, is one of ours. */
function relevant(i: Incident): string[] {
  const names = [i.service_name, ...(i.affected_products ?? []).map((p) => p.title)];
  return names.filter((n) => WANTED.has(norm(n))).map((n) => n!.trim());
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Google Analytics platform status",
  description:
    "Open incidents for Google Analytics on the Google Ads Status Dashboard — where Google " +
    "lists it, not the Workspace dashboard. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/status/publisher/incidents.json`);
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
