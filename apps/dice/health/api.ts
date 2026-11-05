import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL, isObject, isUnauthorized } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "Partner API reachable",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 300,
  async check(_input, ctx) {
    const response = await ctx.fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "{ viewer { id } }" }),
    });
    const body: unknown = await response.json().catch(() => null);
    if (isUnauthorized(body)) {
      return { state: "ok", message: "DICE authentication layer is responding." };
    }
    if (
      response.ok && isObject(body) && isObject(body.data) && isObject(body.data.viewer) &&
      body.data.viewer.id != null
    ) return { state: "ok" };
    return {
      state: response.status >= 500 ? "down" : "unknown",
      message: `Unexpected partner API response (HTTP ${response.status}).`,
    };
  },
};
export default api;
