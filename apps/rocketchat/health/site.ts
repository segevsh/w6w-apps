/**
 * Is THIS workspace's API host answering? An unsigned `GET /api/v1/me` against the connection's
 * own `<workspace>.rocket.chat`. An unauthenticated call is answered 401 with Rocket.Chat's JSON
 * error envelope (`{"success": false, "status": "error", "message": "You must be logged in to
 * do this."}` — read live from open.rocket.chat on 2026-10-06), which proves the host and its
 * auth layer are serving. Token validity is the derived `auth:*` check's job, so a 401 is a PASS.
 * An HTML body (a parked or wrong host) is not.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_PATH, apiHost, type RocketChatDisplay } from "../lib/client.ts";

const site: HealthCheckDefinition = {
  key: "site",
  title: "Workspace API reachable",
  description:
    "Unsigned GET /api/v1/me on this connection's workspace. Rocket.Chat's JSON 401 passes — " +
    "it proves the API is answering; credential validity is the `auth:*` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as RocketChatDisplay;
    let url: string;
    try {
      url = `https://${apiHost(display.workspace)}${API_PATH}/me`;
    } catch (e) {
      return { state: "unknown", message: (e as Error).message };
    }
    const res = await ctx.fetch(url, { headers: { accept: "application/json" } });
    const text = await res.text();
    if (res.status >= 500) return { state: "down", message: `workspace returned ${res.status}` };
    let body: { success?: unknown; _id?: unknown } | null = null;
    try {
      body = JSON.parse(text);
    } catch { /* not JSON */ }
    if (body && (typeof body.success === "boolean" || typeof body._id === "string")) {
      return { state: "ok", ttlSeconds: 120 };
    }
    return {
      state: "down",
      message: `HTTP ${res.status} did not carry a Rocket.Chat JSON response — wrong workspace?`,
    };
  },
};

export default site;
