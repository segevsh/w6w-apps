/**
 * Does this connection's own Accelo deployment answer?
 *
 * Annotation:
 *
 *   - `kind: "dependency"`, `scope: "connection"` — every Connection points at
 *     a different `{deployment}.api.accelo.com`, and "that host is gone" is a
 *     different problem with a different fix from "the token expired".
 *   - `credential: "context"` — needs the Connection to know WHICH host, and no
 *     credential to read the answer; `sign` must not run, so an expired token
 *     can never make the deployment look down.
 *   - No `network.allow`: `*.api.accelo.com` is already on the app's allowlist.
 *
 * The probe is an unsigned `GET /api/v0/tokeninfo`. Verified live 2026-10-06:
 * a real deployment (`accelo`) answers `401 {"meta":{"status":"invalid_client",…}}`
 * and an unknown one answers `400 {"meta":{"status":"invalid_request","message":
 * "Deployment 'x' was not found."}}`. So a schema-correct 401 PASSES — it proves
 * the host serves — while a 400 "not found" (the account was renamed or closed),
 * a 5xx and a transport failure are the outages this check exists to catch.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { apiBase } from "../lib/client.ts";

const deployment: HealthCheckDefinition = {
  key: "deployment",
  title: "Deployment host reachable",
  description:
    "Unauthenticated request to this connection's Accelo deployment. A 401 passes — it proves the host is serving; credential validity is the `auth:*` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { deployment?: string };
    if (!display.deployment) {
      return { state: "unknown", message: "connection records no deployment" };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${apiBase(display.deployment)}/tokeninfo`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "down", message: `deployment unreachable: ${String(err)}` };
    }

    const body = await res.json().catch(() => undefined) as
      | { meta?: { status?: string; message?: string } }
      | undefined;

    if (res.status >= 500) return { state: "down", message: `deployment returned ${res.status}` };
    if (res.status === 400 || res.status === 404) {
      return {
        state: "down",
        message: body?.meta?.message ??
          `deployment returned ${res.status} — the account may have been renamed or closed`,
      };
    }
    if (res.status === 401 && body?.meta?.status !== "invalid_client") {
      // A 401 that is not Accelo's envelope is something else answering at that host.
      return { state: "degraded", message: "401 without Accelo's invalid_client body" };
    }
    // 200 and Accelo's own 401 both mean the deployment is serving.
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default deployment;
