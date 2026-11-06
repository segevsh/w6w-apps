import type { HealthCheckDefinition, HealthState } from "@w6w/types";
const service: HealthCheckDefinition = {
  key: "service",
  title: "Authorize.Net platform status",
  kind: "service",
  covers: ["*"],
  network: { allow: ["status.authorize.net"] },
  minIntervalSeconds: 60,
  async check(_input, ctx) {
    const res = await ctx.fetch("https://status.authorize.net/api/v2/status.json");
    if (!res.ok) return { state: "unknown", message: `Status feed returned HTTP ${res.status}` };
    const body = await res.json().catch(() => null) as {
      status?: { indicator?: string; description?: string };
    } | null;
    const states: Record<string, HealthState> = {
      none: "ok",
      minor: "degraded",
      major: "down",
      critical: "down",
      maintenance: "degraded",
    };
    return {
      state: states[body?.status?.indicator ?? ""] ?? "unknown",
      message: body?.status?.description ?? "Unrecognized status feed",
      ttlSeconds: 60,
    };
  },
};
export default service;
