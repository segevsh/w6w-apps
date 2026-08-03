/**
 * How much headroom is left on THIS credential — Freshservice.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived
 *     `auth:*` check answers "is the credential live"; this answers "will the
 *     next hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's
 *     defaults and both are correct: the allowance belongs to the account
 *     behind the credential, and reading it needs the credential on the wire.
 *     Signing is safe because the probe stays on the app's own egress
 *     allowlist (`*.freshservice.com`) — this check declares no
 *     `network.allow` of its own, which the spec forbids alongside a signed
 *     posture.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /api/v2/tickets?per_page=1`. Freshservice publishes no whoami —
 * there is no `/agents/me` in the v2 surface — and the docs' own
 * authentication example is `GET /api/v2/tickets`, so that is the cheapest
 * documented read. It is narrowed to a single row. The domain comes from the
 * Connection's redacted display data; it identifies the account, so it belongs
 * to the Connection rather than to a param.
 *
 * Freshservice meters **per account per minute** — the ceiling is 100/200/400/500
 * requests a minute by plan, and higher with a rate-limit add-on. Every response
 * carries `X-Ratelimit-Total`, `X-Ratelimit-Remaining` and
 * `X-Ratelimit-Used-CurrentRequest`; verified on the wire against several live
 * portals, where the headers are present even on an unauthenticated 403. Some
 * accounts report the values as decimals (`7000.0`) and some send
 * `X-Ratelimit-Used` rather than `…-Used-CurrentRequest`, so the parse is
 * deliberately tolerant.
 *
 * The number is an account-level ceiling rather than a promise about any one
 * endpoint: the busiest calls (List Tickets, View/Create/Update Ticket, List
 * Assets, List Agents, List Requesters) each carry their own sub-limit inside
 * the overall budget, and those sub-limits are not exposed in any header.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

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
    "Per-minute account allowance remaining, read off the `X-Ratelimit-*` headers on a one-row ticket read.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { domain?: string };
    if (!display.domain) {
      return { state: "unknown", message: "connection records no domain" };
    }

    const res = await ctx.fetch(`${baseUrl(display.domain)}/tickets?per_page=1`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const h = res.headers;
    const limit = num(h.get("x-ratelimit-total"));
    const remaining = num(h.get("x-ratelimit-remaining"));
    if (remaining === undefined) {
      return { state: "unknown", message: "response carried no X-Ratelimit-* headers" };
    }

    return {
      state: headroom(remaining, limit),
      quota: [{
        id: "account",
        limit,
        remaining,
        unit: "requests",
      }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
