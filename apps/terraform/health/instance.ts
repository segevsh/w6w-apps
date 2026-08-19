import type { HealthCheckDefinition } from "@w6w/types";
import { hostFromConnection, MEDIA_TYPE, type TerraformConnectionDisplay } from "../lib/client.ts";

/**
 * Is *this* instance up, and is it still the same one?
 *
 * ## `/api/v2/ping` answers 204 without a token
 *
 * Verified live. That is what makes it the right probe: an expired or revoked
 * token would make an authenticated call fail, and a health check that cannot
 * tell "the service is down" from "your credential stopped working" reports
 * outages that are not outages. This asks only whether the instance answers.
 *
 * ## The response names the product and its API version
 *
 *     tfp-appname: HCP Terraform
 *     tfp-api-version: 2.6
 *
 * Both are recorded at connect time. `tfp-appname` distinguishes HashiCorp's
 * managed service from a self-hosted **Terraform Enterprise**, and if it
 * *changes* the connection is now pointing somewhere else entirely — a host
 * that has been repointed, or a DNS entry that moved.
 *
 * `tfp-api-version` is what makes a Terraform Enterprise upgrade visible.
 * Endpoints appear and change behaviour between versions, and a call that 404s
 * because the instance is older than the feature says nothing at all about
 * versions. A drift here is the explanation.
 *
 * ## This is the only check that speaks for a self-hosted instance
 *
 * The `service` check reads HashiCorp's public status page, which covers the
 * managed service and knows nothing about an organisation's own Terraform
 * Enterprise. For those connections this is the whole picture.
 */
const check: HealthCheckDefinition = {
  key: "instance",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  title: "Instance reachable",
  description:
    "Pings this connection's own instance UNAUTHENTICATED — /api/v2/ping answers 204 without a " +
    "token, so a revoked credential does not read as an outage. Also watches for the product or " +
    "API version changing under the connection.",
  covers: ["dependency"],
  severity: "fatal",
  minIntervalSeconds: 60,
  network: { allow: ["*"] },

  async check(_input, ctx) {
    let host: string;
    try {
      host = hostFromConnection(ctx.connection);
    } catch (err) {
      return { state: "unknown", message: `this connection has no usable host: ${String(err)}` };
    }
    const display = (ctx.connection?.display ?? {}) as TerraformConnectionDisplay;

    let res: Response;
    const started = Date.now();
    try {
      res = await ctx.fetch(`${host}/api/v2/ping`, { headers: { accept: MEDIA_TYPE } });
    } catch (err) {
      return { state: "down", message: `could not reach ${host}: ${String(err)}` };
    }
    await res.body?.cancel();
    const latencyMs = Date.now() - started;

    if (!res.ok) {
      return {
        state: res.status >= 500 ? "down" : "degraded",
        message: `${host}/api/v2/ping answered ${res.status} — it answers 204 unauthenticated ` +
          "when healthy, so anything else here is the instance, not the credential",
        latencyMs,
      };
    }

    const appName = res.headers.get("tfp-appname") ?? undefined;
    const apiVersion = res.headers.get("tfp-api-version") ?? undefined;

    // A changed product name means the host now points at something else.
    if (display.appName && appName && appName !== display.appName) {
      return {
        state: "degraded",
        message: `${host} now identifies as "${appName}", and this connection was made against ` +
          `"${display.appName}" — the address is pointing at a different instance`,
        latencyMs,
      };
    }

    if (display.apiVersion && apiVersion && apiVersion !== display.apiVersion) {
      return {
        state: "degraded",
        message: `${appName ?? "the instance"} is now on API version ${apiVersion}, up from ` +
          `${display.apiVersion} at connect time. Endpoints change between versions, and a call ` +
          "that starts 404ing after an upgrade says nothing about versions in its error",
        latencyMs,
      };
    }

    return {
      state: "ok",
      message: `${appName ?? "the instance"} at ${new URL(host).host} answered${
        apiVersion ? ` (API ${apiVersion})` : ""
      }`,
      latencyMs,
    };
  },
};

export default check;
