/**
 * Is **this** Qdrant working? — the only question that can be asked here.
 *
 * Qdrant is an open-source database. There is no vendor status page, because
 * for most deployments there is no vendor: the instance is a container in
 * somebody's cluster. Even on Qdrant Cloud a cluster is dedicated, so a global
 * page would not answer whether *yours* is up.
 *
 * ## Why `readyz` rather than `healthz`
 *
 * Qdrant exposes the Kubernetes trio. **`livez`** says the process is alive —
 * true of an instance that has not loaded a thing. **`readyz`** says it is
 * ready to serve, which is the question a workflow about to query actually has.
 *
 * The distinction matters during a restart: a Qdrant that is rebuilding indexes
 * answers `livez` immediately and `readyz` only when it can serve, and a check
 * on the first would report healthy through the entire window where queries
 * fail.
 *
 * These endpoints need no credential, which is deliberate — this reports
 * whether the instance is up independently of whether the key is any good, and
 * the derived `auth:api-key` check owns the second question.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { urlFromConnection } from "../lib/client.ts";

const instance: HealthCheckDefinition = {
  key: "instance",
  title: "Instance readiness",
  description:
    "Whether this Qdrant is ready to serve — `readyz`, not `livez`. A restarting instance is " +
    "alive long before it can answer a query.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  // Unauthenticated on purpose: liveness is a separate question from the key.
  credential: "context",
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let base: string;
    try {
      base = urlFromConnection(ctx.connection);
    } catch {
      return { state: "unknown", message: "this connection has no Qdrant URL recorded" };
    }
    const host = new URL(base).host;

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/readyz`, { headers: { accept: "text/plain" } });
    } catch (err) {
      return { state: "down", message: `${host} did not answer: ${String(err)}` };
    }
    await res.body?.cancel();

    if (res.ok) return { state: "ok", message: `${host} is ready`, ttlSeconds: 120 };

    // Not ready is not the same as not running. Ask whether it is alive at all,
    // because "still starting" and "gone" need different responses.
    let live: Response;
    try {
      live = await ctx.fetch(`${base}/livez`, { headers: { accept: "text/plain" } });
    } catch {
      return { state: "down", message: `${host} is not ready and did not answer livez` };
    }
    await live.body?.cancel();

    if (live.ok) {
      return {
        state: "degraded",
        message: `${host} is running but not ready — typically loading collections or rebuilding ` +
          "indexes after a restart, during which queries fail",
      };
    }
    return { state: "down", message: `${host} answered ${res.status} and is not alive` };
  },
};

export default instance;
