/**
 * Is TimelinesAI's API serving? — an unsigned probe of the API itself.
 *
 * `GET /workspace` with NO token. The API answers a schema-correct refusal:
 * `401 {"status":"error","message":"No API token provided…","error_code":"missing_credentials"}`
 * (measured 2026-10-06). That body — not the status code — proves the gateway and auth layer are
 * alive, so it is a PASS: reachability is proven even though the call is "denied".
 *
 *   - A 5xx, or a refusal in no recognisable shape (a Cloudflare error page), is `down`.
 *   - A transport failure is `down` too: the host is the API host, not a third-party status page.
 *   - An unsigned 200 is a shell or proxy, not the API: `unknown`, never a guess.
 *
 * `app.timelines.ai` is already on the app's `network.allow`; this check adds no host.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL, type TimelinesBody } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "TimelinesAI API reachability",
  description:
    "Unsigned GET /workspace. A schema-correct 'missing_credentials' refusal proves the API is up. TimelinesAI publishes no status page.",
  kind: "service",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/workspace`, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "down", message: `could not reach app.timelines.ai: ${String(err)}` };
    }

    const text = await res.text().catch(() => "");
    let body: TimelinesBody | undefined;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = undefined;
    }

    if (res.status >= 500) {
      return { state: "down", message: `TimelinesAI API answered ${res.status}`, ttlSeconds: 60 };
    }
    if (
      (res.status === 401 || res.status === 403) && body?.status === "error" &&
      typeof body.error_code === "string"
    ) {
      return { state: "ok", ttlSeconds: 60 };
    }
    if (res.status === 200) {
      return { state: "unknown", message: "unsigned probe unexpectedly returned 200" };
    }
    return {
      state: "unknown",
      message: `unsigned probe returned ${res.status} without a recognisable error body`,
    };
  },
};

export default api;
