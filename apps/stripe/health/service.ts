/**
 * Is Stripe up? — Stripe runs its own status API rather than Statuspage.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — this answers "is the vendor's platform up", which is a
 *     different question from "is this credential live" (the derived `auth:*`
 *     check).
 *   - `scope: "app"` (the default for this kind) — the answer is identical for
 *     every Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection is supplied and
 *     `sign` never runs, so this reports even before anyone has connected.
 *   - `network.allow` — status.stripe.com is not api.stripe.com. Adding it to
 *     the app's allowlist would widen egress for every action to satisfy one
 *     hook; the allowlist is widened for this hook only, which the spec permits
 *     precisely because the posture is unsigned.
 *   - `severity` defaults to `degraded` for this kind, so a Stripe incident
 *     never hard-fails a target on its own.
 *
 * Stripe is the motivating example for reports-over-booleans: `/current`
 * publishes `api`, `webhooks`, `dashboard` and `checkout` separately, and the
 * API can be perfectly healthy while webhook delivery is degraded. A single
 * boolean would erase exactly the distinction an operator needs.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "status.stripe.com";

const map = (v: string): HealthState => v === "up" ? "ok" : v === "down" ? "down" : "degraded";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Stripe platform status",
  description:
    "Stripe's own status API, reporting api / webhooks / dashboard / checkout separately. Unauthenticated and unsigned.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/current`);
    // `unknown`, never `down`: a status API that itself fails tells us nothing
    // about Stripe, and reporting that as an outage would be a lie.
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      largestatus?: string;
      message?: string;
      statuses?: Record<string, string>;
    };
    if (!body.largestatus) {
      return { state: "unknown", message: "status API returned no rollup" };
    }

    return {
      state: map(body.largestatus),
      message: body.message,
      // One call, four components.
      components: Object.fromEntries(
        Object.entries(body.statuses ?? {}).map(([id, v]) => [id, { state: map(v) }]),
      ),
      ttlSeconds: 60,
    };
  },
};

export default service;
