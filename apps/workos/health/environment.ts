/**
 * Which environment is this connection actually pointed at, and does its key
 * still work?
 *
 * A WorkOS key carries its environment in its prefix — `sk_live_` or
 * `sk_test_` — and the two share **no data at all**. The failure this check
 * exists for is therefore not an outage: it is a staging key doing production
 * work, which succeeds at every call and quietly reads and writes the wrong
 * world.
 *
 * That failure is invisible to a credential test, because the credential is
 * fine. It shows up as an environment that is emptier than expected, so this
 * reads the organization count alongside the environment and reports both —
 * "production, 0 organizations" being the shape of the mistake.
 *
 * A `401` is left as `unknown` rather than `down`, since the derived
 * `auth:api-key` check owns credential failures and reporting them twice helps
 * nobody.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { BASE_URL, displayEnvironment } from "../lib/env.ts";

const environment: HealthCheckDefinition = {
  key: "environment",
  title: "Environment and reachability",
  description:
    "Which WorkOS environment this key belongs to, and how many organizations it can see — " +
    "because a staging key doing production work fails silently rather than loudly.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const declared = displayEnvironment(ctx.connection);

    let res: Response;
    try {
      res = await ctx.fetch(`${BASE_URL}/organizations?limit=100`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "down", message: `could not reach WorkOS: ${String(err)}` };
    }

    if (res.status === 401) {
      await res.body?.cancel();
      // The derived auth check owns this failure.
      return { state: "unknown", message: "the API key was rejected" };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "down", message: `WorkOS answered ${res.status}` };
    }

    const body = await res.json().catch(() => null) as { data?: unknown[] } | null;
    const count = Array.isArray(body?.data) ? body.data.length : 0;

    if (count === 0) {
      // Not an error — but it is exactly what a key pointed at the wrong
      // environment looks like.
      return {
        state: "degraded",
        message:
          `the ${declared} environment has no organizations — correct for a fresh environment, ` +
          "and also what a staging key used for production work looks like",
      };
    }
    return {
      state: "ok",
      message: `${declared} environment, ${count}${count === 100 ? "+" : ""} organizations`,
      ttlSeconds: 300,
    };
  },
};

export default environment;
