/**
 * How much headroom is left on THIS credential — Contentful.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived `auth:*`
 *     check answers "is the credential live"; this answers "will the next
 *     hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: the allowance belongs to the credential, and reading
 *     it needs the credential on the wire. Signing is safe because the probe
 *     stays on the app's own egress allowlist — this check declares no
 *     `network.allow` of its own, which the spec forbids alongside a signed
 *     posture.
 *   - `severity: "informational"` — running low is worth showing and never worth
 *     failing a verdict over.
 *
 * Probe: `GET /spaces/{spaceId}` on the delivery API — the same call the auth
 * `test` hook makes, and the space id comes from the Connection's redacted
 * display data rather than the credential. Contentful has no headroom endpoint;
 * it meters two windows at once, a per-second burst and a per-hour allowance,
 * and reports both on every response.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";
import { API_HOSTS } from "../lib/client.ts";

const num = (v: string | null): number | undefined => {
  if (v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. It is reported honestly anyway so a UI can
 * show why a workflow is about to start getting 429s.
 */
const headroom = (remaining?: number, limit?: number): HealthState => {
  if (remaining === undefined) return "unknown";
  if (remaining <= 0) return "down";
  if (limit !== undefined && limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  description:
    "Per-second and per-hour allowances remaining, read off the `X-Contentful-RateLimit-*` headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { space?: { id?: string } };
    const spaceId = display.space?.id;
    if (!spaceId) return { state: "unknown", message: "connection records no space id" };

    const res = await ctx.fetch(`${API_HOSTS.delivery}/spaces/${spaceId}`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const secondLimit = num(h.get("x-contentful-ratelimit-second-limit"));
    const secondRemaining = num(h.get("x-contentful-ratelimit-second-remaining"));
    const hourLimit = num(h.get("x-contentful-ratelimit-hour-limit"));
    const hourRemaining = num(h.get("x-contentful-ratelimit-hour-remaining"));

    if (secondRemaining === undefined && hourRemaining === undefined) {
      return { state: "unknown", message: "response carried no X-Contentful-RateLimit-* headers" };
    }

    return {
      // Worst window wins: a burst can be exhausted while the hour is fine.
      state: worstHealthState([
        headroom(secondRemaining, secondLimit),
        headroom(hourRemaining, hourLimit),
      ]),
      quota: [
        { id: "second", limit: secondLimit, remaining: secondRemaining, unit: "requests" },
        { id: "hour", limit: hourLimit, remaining: hourRemaining, unit: "requests" },
      ],
      ttlSeconds: 60,
    };
  },
};

export default quota;
