import type { HealthCheckDefinition } from "@w6w/types";
import { describeError, urlFromConnection } from "../lib/client.ts";

/**
 * Is this Home Assistant answering, and has it finished starting?
 *
 * ## `STARTING` is a real state and it lasts a while
 *
 * After a restart Home Assistant serves the API immediately but spends
 * anywhere from seconds to several minutes loading integrations. During that
 * window entities exist and read `unavailable`, service calls fail, and
 * everything looks broken while nothing is wrong. `GET /api/config` reports
 * `state`, so this can say "starting" rather than "down" — which is the
 * difference between waiting and paging somebody.
 *
 * ## Signed, unlike most dependency checks in this pack
 *
 * There is no unauthenticated endpoint worth probing: `GET /api/` requires the
 * token too, and the web UI on `/` is a single-page app that returns 200 while
 * the API is entirely dead. So this uses the credential, and a 401 is reported
 * as `unknown` — the derived `auth:token` check owns credential failures, and
 * a revoked token is not an outage.
 */
const instance: HealthCheckDefinition = {
  key: "instance",
  title: "Instance reachable",
  description:
    "Whether this Home Assistant answers and has finished starting. A restarting instance serves " +
    "the API for minutes before its integrations are loaded, during which everything reads " +
    "unavailable.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let base: string;
    try {
      base = urlFromConnection(ctx.connection);
    } catch {
      return { state: "unknown", message: "this connection has no Home Assistant URL recorded" };
    }
    const host = new URL(base).host;

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/api/config`, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "down", message: `${host} did not answer: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");

    if (res.status === 401 || res.status === 403) {
      // The derived auth check owns this — a revoked token is not an outage.
      return { state: "unknown", message: "the access token was rejected" };
    }
    if (!res.ok) {
      return { state: "down", message: `${host}: ${describeError(res.status, text)}` };
    }

    interface HaConfig {
      state?: string;
      version?: string;
      location_name?: string;
    }
    let config: HaConfig | null = null;
    try {
      config = JSON.parse(text) as HaConfig;
    } catch {
      return {
        state: "degraded",
        message: `${host} answered without JSON — this is usually a reverse proxy or a login ` +
          "page rather than Home Assistant",
      };
    }

    if (config?.state === "STARTING") {
      return {
        state: "degraded",
        message: `${host} is still starting — integrations are loading, so entities will read ` +
          "unavailable and service calls will fail until it finishes",
      };
    }
    if (config?.state && config.state !== "RUNNING") {
      return { state: "degraded", message: `${host} reports state ${config.state}` };
    }

    return {
      state: "ok",
      message: `${config?.location_name ?? host} running ${
        config?.version ?? "an unknown version"
      }`,
      ttlSeconds: 120,
    };
  },
};

export default instance;
