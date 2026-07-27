/**
 * Is GitLab up? — status.io.
 *
 * NOTE ON THE PROVIDER: GitLab's status page is NOT an Atlassian Statuspage
 * (unlike GitHub/Bitbucket in this pack) — status.gitlab.com is hosted on
 * status.io, whose public JSON lives at
 * `https://api.status.io/1.0/status/<pageId>`. The shape and vocabulary differ,
 * so this check does not share github/health/service.ts's parser.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — this answers "is the vendor's platform up", which is a
 *     different question from "is this credential live" (the derived `auth:*`
 *     check) or "is there quota left" (`quota`).
 *   - `scope: "app"` (the default for this kind) — the answer is identical for
 *     every Connection, so the host runs it once and shares the result. Running
 *     it per Connection would multiply one useful call by the number of users
 *     and is a good way to get rate-limited by a status page.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected. It
 *     only speaks for GitLab.com; a self-managed instance has no status.io page.
 *   - `network.allow` — api.status.io is deliberately NOT on the app's egress
 *     allowlist; an action has no business calling it. The allowlist is widened
 *     for this one hook only, which the spec permits precisely because the
 *     posture is unsigned: a signed request must never reach a third-party
 *     status host.
 *   - `severity` defaults to `degraded` for this kind, so a vendor incident
 *     never hard-fails a target on its own.
 *
 * One probe, many components: status.io returns the overall rollup plus a
 * per-service array, so a Container Registry incident reports against that
 * component rather than greying out the whole platform.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

/**
 * status.io's status_code vocabulary (kb.status.io/developers/status-codes):
 * 100 Operational, 200 Maintenance, 300 Degraded Performance,
 * 400 Partial Service Disruption, 500 Service Disruption, 600 Security Event.
 * 500/600 are full outages → `down`; 200/300/400 are partial → `degraded`.
 */
const CODE: Record<number, HealthState> = {
  100: "ok",
  200: "degraded",
  300: "degraded",
  400: "degraded",
  500: "down",
  600: "down",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const STATUS_HOST = "api.status.io";
/** GitLab System Status — the status.io page id behind status.gitlab.com. */
const PAGE_ID = "5b36dc6502d06804c08349f7";

interface StatusIoResult {
  status_overall?: { status?: string; status_code?: number };
  status?: Array<{ name?: string; status?: string; status_code?: number }>;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "GitLab platform status",
  description:
    "status.io rollup for GitLab.com (status.gitlab.com), with per-component detail. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/1.0/status/${PAGE_ID}`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about the vendor, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as { result?: StatusIoResult };
    const result = body.result;
    if (!result?.status_overall) {
      return { state: "unknown", message: "status API returned no rollup" };
    }

    const components: Record<string, { state: HealthState }> = {};
    for (const c of result.status ?? []) {
      if (!c.name) continue;
      components[slug(c.name)] = { state: CODE[c.status_code ?? -1] ?? "unknown" };
    }

    return {
      state: CODE[result.status_overall.status_code ?? -1] ?? "unknown",
      message: result.status_overall.status,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
