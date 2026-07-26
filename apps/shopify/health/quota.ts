/**
 * How much headroom is left on THIS credential — Shopify.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived `auth:*`
 *     check answers "is the credential live"; this answers "will the next
 *     hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: the allowance belongs to the credential, and reading
 *     it needs the credential on the wire. Signing is safe because the probe
 *     stays on the app's own egress allowlist (`*.myshopify.com`) — this check
 *     declares no `network.allow` of its own, which the spec forbids alongside a
 *     signed posture.
 *   - `severity: "informational"` — running low is worth showing and never worth
 *     failing a verdict over.
 *
 * Probe: `GET /shop.json`, deliberately, and not `/products.json` — the latter
 * 403s without `read_products`, which would report a perfectly good token as
 * broken. The store handle comes from the Connection's redacted display data.
 *
 * Shopify reports a LEAKY BUCKET as `used/total` (e.g. `32/40`): headroom
 * refills continuously at a fixed rate rather than resetting on a boundary,
 * which is why no `resetAt` is reported — there is no reset instant to report.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. It is reported honestly anyway so a UI can
 * show why a workflow is about to start getting 429s.
 */
const headroom = (remaining: number, limit: number): HealthState => {
  if (remaining <= 0) return "down";
  if (limit > 0 && remaining / limit < 0.1) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API call-limit headroom",
  description:
    "Leaky-bucket headroom from `X-Shopify-Shop-Api-Call-Limit`, reported as calls still available before throttling.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { shop?: string };
    if (!display.shop) return { state: "unknown", message: "connection records no store handle" };

    const res = await ctx.fetch(`${baseUrl(display.shop)}/shop.json`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const raw = res.headers.get("x-shopify-shop-api-call-limit");
    const [usedRaw, totalRaw] = (raw ?? "").split("/");
    const used = Number(usedRaw);
    const total = Number(totalRaw);
    if (!Number.isFinite(used) || !Number.isFinite(total)) {
      return {
        state: "unknown",
        message: "response carried no X-Shopify-Shop-Api-Call-Limit header",
      };
    }

    const remaining = total - used;
    return {
      state: headroom(remaining, total),
      quota: [{ id: "bucket", limit: total, remaining, unit: "requests" }],
      ttlSeconds: 60,
    };
  },
};

export default quota;
