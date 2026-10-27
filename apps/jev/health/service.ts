/**
 * Is the Jev API reachable? TypeSafe publishes no machine-readable status
 * feed, so this probes the scope-free `GET /models` endpoint without
 * credentials: any HTTP answer (including 401) proves the service is up; a
 * 5xx means it is down. Network failures are `unknown`, never `down`.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const service: HealthCheckDefinition = {
  key: "service",
  title: "Jev API reachability",
  description: "Probes GET /models and reports the service down on 5xx responses.",
  kind: "service",
  covers: ["*"],
  network: { allow: ["api.typesafe.ai"] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/models`);
    } catch (e) {
      return { state: "unknown", message: `probe failed: ${(e as Error).message}` };
    }
    if (res.status >= 500) return { state: "down", message: `API returned ${res.status}` };
    return { state: "ok", ttlSeconds: 300 };
  },
};

export default service;
