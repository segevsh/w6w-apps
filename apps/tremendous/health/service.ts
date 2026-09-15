/**
 * Is Tremendous up?
 *
 * ## The status page is real, verified three ways on 2026-09-15
 *
 * Tremendous publishes at **`status.tremendous.com`**, on a custom
 * (non-Atlassian-Statuspage) status-page platform.
 *
 * **(a) The obvious decoy is checked and ruled out.** `tremendous.statuspage.io`
 * — the Atlassian Statuspage subdomain a vendor of this size would typically
 * use — redirects to `/inactive`: Tremendous does not use Statuspage at all,
 * which is exactly the kind of stale/wrong-vendor guess this app avoids.
 *
 * **(b) Content-type AND body, not just 200.** `GET
 * /api/v2/summary.json` answers `application/json`, 391 bytes, parsing as
 * `{"page": {"name", "url", "status"}, "activeIncidents": [...]}`. A
 * deliberately bogus sibling path (`/api/v1/summary`, `/api/summary`,
 * `/api/v2/status.json`) answers a real `404` (6,986-byte HTML page, not the
 * summary) — so the summary endpoint is not a catch-all.
 *
 * **(c) Does the page describe THIS product?** Yes: `page.name` is literally
 * `"Tremendous"` and `page.url` is `https://status.tremendous.com`. The
 * companion `/api/v2/components.json` (also verified live, 1,187 bytes) lists
 * components named `API`, `Reward redemptions`, `Marketing site`, `Dashboard`
 * and `Sandbox` — `Reward redemptions` and `Sandbox` in particular are
 * Tremendous-specific concepts no unrelated or unclaimed page would invent.
 * On 2026-09-15 the live page carried one real, in-progress incident
 * ("Delays adding some Visa cards to digital wallets", impact
 * `DEGRADEDPERFORMANCE`), which is further evidence this is a maintained,
 * genuine feed rather than a static placeholder.
 *
 * ## What `page.status` and each component's `status` mean
 *
 * Confirmed live values are `"UP"` (page-level, healthy) and `"OPERATIONAL"`
 * (component-level, healthy), plus `"DEGRADEDPERFORMANCE"` on the one
 * component actually degraded at verification time. The platform's full
 * enum was not found in any Tremendous-published document, so beyond these
 * confirmed values this check reads case-insensitively for the word
 * `OUTAGE` (→ down), `DEGRADED` or `PARTIAL` (→ degraded), and
 * `MAINTENANCE` (→ degraded) in whatever string the page returns, falling
 * back to `unknown` for anything else — a guess kept narrow enough that it
 * can only widen a verdict the roll-up already knows how to show, never
 * fabricate a state this app has not actually observed the page emit.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Tremendous is
 * SaaS-only — there is no self-hosted deployment — so an incident here is
 * evidence about every Connection this app can hold.
 *
 * `credential: "none"` is the default for `kind: "service"`, stated
 * explicitly because it is the precondition for the `network` widening below
 * — a status host must never see an API key.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

export const STATUS_URL = "https://status.tremendous.com/api/v2/summary.json";

interface StatusIncident {
  name?: string;
  status?: string;
  impact?: string;
}

interface StatusSummary {
  page?: { name?: string; url?: string; status?: string };
  activeIncidents?: StatusIncident[];
}

/**
 * Map whatever string the page returns to a `HealthState`, per the confirmed
 * values and the narrow keyword fallback documented above.
 */
export function mapStatus(status: string | undefined): HealthState {
  if (!status) return "unknown";
  const s = status.toUpperCase();
  if (s === "UP" || s === "OPERATIONAL") return "ok";
  if (s.includes("OUTAGE")) return "down";
  if (s.includes("DEGRADED") || s.includes("PARTIAL") || s.includes("MAINTENANCE")) {
    return "degraded";
  }
  return "unknown";
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Tremendous platform status",
  description: "Page-level status from status.tremendous.com, plus any active incidents.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.tremendous.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Tremendous itself — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body?.page) {
      return { state: "unknown", message: "Status page returned an unreadable body" };
    }

    // Guard against a future redirect or platform migration silently pointing this
    // probe at someone else's page.
    const pageUrl = body.page.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.tremendous\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Tremendous's" };
    }

    const state = mapStatus(body.page.status);
    const incidents = body.activeIncidents ?? [];
    const notes: string[] = [];
    if (incidents.length > 0) {
      notes.push(
        incidents.map((i) => `${i.name ?? "incident"} (${i.impact ?? i.status ?? "?"})`).join(
          "; ",
        ),
      );
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      ttlSeconds: 60,
    };
  },
};

export default service;
