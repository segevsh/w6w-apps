import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * PostBin publishes no status page and no Atom/RSS status feed — nothing
 * linked from postb.in itself, no status.postb.in. Every documented API
 * endpoint also either needs an existing binId or creates a new bin, so
 * there is no side-effect-free *API* probe either. The narrowest honest
 * probe left is the plain homepage: `GET /` needs no credential (this App
 * declares no Auth at all) and creates nothing.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "PostBin reachable",
  description:
    "GETs the PostBin homepage. PostBin publishes no status page/feed, and every API endpoint either needs an existing bin or creates one, so this is the narrowest available side-effect-free probe.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/`);
    if (!res.ok) {
      return { state: "down", message: `postb.in returned ${res.status}`, ttlSeconds: 120 };
    }
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default service;
