import type { HealthCheckDefinition } from "@w6w/types";
import { hostFromConnection } from "../lib/client.ts";

/**
 * `GET /v1/health` — unauthenticated, and it answers in plain text.
 *
 * ## Unauthenticated matters more here than usual
 *
 * Airbyte access tokens live for **three minutes**. A signed health check
 * against this API would spend most of its life reporting on the token rather
 * than on Airbyte, and every expiry would look like an outage. This endpoint
 * needs no credential, so it reads the service itself.
 *
 * ## It is not JSON
 *
 * Verified live: `GET https://api.airbyte.com/v1/health` returns **200 with
 * the body `Successful operation`** and a wildcard content type rather than
 * JSON. A check that parses it fails on a perfectly healthy Airbyte, which is
 * exactly the sort of thing worth encoding once rather than discovering twice.
 *
 * ## It speaks for whichever Airbyte this connection points at
 *
 * Airbyte Cloud and a self-hosted deployment are the same software at
 * different addresses, so this probes the connection's own host — which for a
 * self-managed instance is the only thing that could speak for it at all.
 */
const check: HealthCheckDefinition = {
  key: "api",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  title: "Airbyte API reachable",
  description:
    "Probes this connection's own Airbyte through the UNAUTHENTICATED `/v1/health`, which " +
    "matters here because access tokens last three minutes — a signed check would report on the " +
    "token. The response is PLAIN TEXT, not JSON.",
  covers: ["dependency", "service"],
  severity: "fatal",
  minIntervalSeconds: 60,
  network: { allow: ["*"] },

  async check(_input, ctx) {
    const host = hostFromConnection(ctx.connection);

    const started = Date.now();
    let res: Response;
    try {
      res = await ctx.fetch(`${host}/v1/health`, { headers: { accept: "*/*" } });
    } catch (err) {
      return {
        state: "down",
        message: `could not reach ${new URL(host).host}: ${String(err)}`,
        latencyMs: Date.now() - started,
      };
    }
    const latencyMs = Date.now() - started;
    // Plain text. Parsing it as JSON fails on a healthy Airbyte.
    const body = (await res.text().catch(() => "")).trim();

    if (res.status >= 500) {
      return { state: "down", message: `Airbyte answered ${res.status}`, latencyMs };
    }
    if (res.status === 404) {
      return {
        state: "degraded",
        message: `${new URL(host).host} answered 404 to /v1/health — for a self-managed ` +
          "deployment this usually means the host is right and the API is not exposed at the " +
          "path the public API uses",
        latencyMs,
      };
    }
    if (!res.ok) {
      return { state: "degraded", message: `Airbyte answered ${res.status}`, latencyMs };
    }
    if (/<html/i.test(body)) {
      return {
        state: "degraded",
        message: "something answered for Airbyte with HTML — most likely a proxy or a login " +
          "page rather than the API",
        latencyMs,
      };
    }

    return {
      state: "ok",
      message: `${new URL(host).host} answered ${
        JSON.stringify(body.slice(0, 40))
      } in ${latencyMs}ms`,
      latencyMs,
    };
  },
};

export default check;
