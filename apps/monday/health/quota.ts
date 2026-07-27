/**
 * How much headroom is left on THIS credential — monday.com.
 *
 * monday does not meter in a simple `X-RateLimit-*` header the way a REST API
 * does. Its real budget is **query complexity**: every account has a complexity
 * allowance per rolling window, and a GraphQL call can ask for what remains by
 * selecting the top-level `complexity` object — `before` / `after` are the
 * budget before and after this very query, and `reset_in_x_seconds` is when the
 * window rolls over. That object IS the honest quota signal, so this probe reads
 * it rather than inventing a header that monday does not send.
 *
 * Annotation:
 *
 *   - `kind: "quota"` — a different question from liveness. The derived `auth:*`
 *     check answers "is the credential live"; this answers "will the next batch
 *     of calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: the allowance belongs to the credential, and reading
 *     it needs the credential on the wire. Signing is safe because the probe
 *     stays on the app's own egress allowlist — this check declares no
 *     `network.allow` of its own, which the spec forbids alongside a signed
 *     posture.
 *   - `severity: "informational"` — running low is worth showing and never worth
 *     failing a verdict over.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_URL, API_VERSION } from "../lib/client.ts";

/**
 * Headroom is context, not a verdict — `severity: "informational"` means this
 * state never worsens a roll-up. It is reported honestly anyway so a UI can show
 * why a workflow is about to start getting complexity errors.
 */
const headroom = (remaining: number): HealthState => {
  if (remaining <= 0) return "down";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API complexity headroom",
  description:
    "Query-complexity budget remaining, read off monday's top-level `complexity` object (`after` / `reset_in_x_seconds`).",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "api-version": API_VERSION },
      body: JSON.stringify({
        query: "{ complexity { before after reset_in_x_seconds } }",
      }),
    });
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      data?: { complexity?: { before?: number; after?: number; reset_in_x_seconds?: number } };
      errors?: Array<{ message?: string }>;
    };
    if (body.errors?.length) {
      return { state: "unknown", message: body.errors[0]?.message ?? "complexity query failed" };
    }

    const c = body.data?.complexity;
    if (!c || typeof c.after !== "number") {
      return { state: "unknown", message: "response carried no complexity budget" };
    }

    // `before` is the budget just before this probe ran — the closest thing
    // monday gives to a period ceiling — and `after` is what is left now.
    const limit = typeof c.before === "number" ? c.before : undefined;
    const resetAt = typeof c.reset_in_x_seconds === "number"
      ? new Date(Date.now() + c.reset_in_x_seconds * 1000).toISOString()
      : undefined;

    const bucket: HealthQuota = {
      id: "complexity",
      limit,
      remaining: c.after,
      resetAt,
      unit: "complexity",
    };

    return { state: headroom(c.after), quota: [bucket], ttlSeconds: 60 };
  },
};

export default quota;
