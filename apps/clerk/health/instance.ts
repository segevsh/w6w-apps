/**
 * Which Clerk instance is this Connection actually talking to, and is it the one the workflow
 * expects?
 *
 * `GET /v1/instance` is the cheapest authenticated read Clerk documents, and it answers
 * `environment_type: "development" | "production"`. That distinction is worth surfacing on its
 * own: a development instance enforces a tenth of a production instance's rate limit (100 vs
 * 1000 requests per 10 seconds, per Clerk's own `CreateUser` docs) and relaxes checks a
 * production instance does not — so a workflow validated against a development Secret Key can
 * start failing, or start accepting things it shouldn't, purely from being pointed at production
 * later. This is a signal the derived `auth:secret-key` check (which only proves the key is
 * live) never surfaces.
 *
 * `kind: "dependency"`, `scope: "connection"`, `credential: "signed"` — this is about what THIS
 * credential can reach, not the vendor's own uptime (that's `service`).
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, describeError } from "../lib/client.ts";

const instance: HealthCheckDefinition = {
  key: "instance",
  title: "Instance reachability",
  description:
    "Reads this connection's own Clerk instance and reports whether it is development or " +
    "production — the two enforce different rate limits and validation.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}/instance`, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "down", message: `could not reach Clerk: ${String(err)}` };
    }

    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      // The derived auth check owns credential failures; this one gets out of the way.
      return { state: "unknown", message: "the Secret Key was rejected" };
    }
    if (res.status === 429) {
      return { state: "degraded", message: "rate limited — back off before retrying" };
    }
    if (!res.ok) {
      return { state: "down", message: `Clerk returned ${describeError(res.status, text)}` };
    }

    const body = JSON.parse(text) as { environment_type?: string };
    return {
      state: "ok",
      message: body.environment_type
        ? `connected to a ${body.environment_type} instance`
        : "connected",
      ttlSeconds: 300,
    };
  },
};

export default instance;
