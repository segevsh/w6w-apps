/**
 * Can this connection reach **its own** Vanta tenant?
 *
 * The status page cannot answer that, and here there is a second reason beyond
 * the usual one: Vanta allows **one active token per application**, so the most
 * likely cause of a broken connection is not an outage at all — it is something
 * else minting a token with the same client id and secret, which silently
 * revokes this one.
 *
 * That failure is invisible from outside and intermittent from inside: whichever
 * process refreshed most recently works, and the other gets `401` until it
 * refreshes, at which point they swap. A check that reported it as "credential
 * expired" would send somebody to rotate a secret that is perfectly good.
 *
 * So a `401` here is reported as `degraded` with that explanation, rather than
 * being left to the derived `auth:client-credentials` check — this is the one
 * case where the two are worth saying differently.
 *
 * The probe is `GET /v1/frameworks?pageSize=1`: every tenant has frameworks, it
 * needs only the base read scope, and it is one of the 50 requests a minute the
 * whole API allows — hence the long interval.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_PATH, baseUrlFromConnection } from "../lib/client.ts";

const tenant: HealthCheckDefinition = {
  key: "tenant",
  title: "Tenant reachability",
  description:
    "Whether this connection's own Vanta tenant answers. A 401 here usually means another " +
    "process minted a token for the same application, not that the secret is wrong.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  // Deliberately long: the whole API allows 50 requests a minute.
  minIntervalSeconds: 900,

  async check(_input, ctx) {
    const base = baseUrlFromConnection(ctx.connection);

    let res: Response;
    try {
      res = await ctx.fetch(`${base}${API_PATH}/frameworks?pageSize=1`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "down", message: `could not reach ${base}: ${String(err)}` };
    }

    if (res.status === 401) {
      await res.body?.cancel();
      return {
        state: "degraded",
        message:
          "the token was rejected — most often because something else minted a token for the " +
          "same Vanta application, which revokes this one. Check for a second connection or " +
          "script using these credentials before rotating the secret",
      };
    }
    if (res.status === 403) {
      await res.body?.cancel();
      return {
        state: "degraded",
        message: "the token is valid but its scope does not cover reading frameworks — a scope " +
          "problem rather than an outage",
      };
    }
    if (res.status === 429) {
      await res.body?.cancel();
      // Being rate limited is not the tenant being down.
      return {
        state: "degraded",
        message: "rate limited — Vanta allows 50 requests a minute across the whole API, so a " +
          "busy workflow can crowd out this check",
      };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "down", message: `${base} answered ${res.status}` };
    }

    const body = await res.json().catch(() => null) as
      | { results?: { data?: Array<{ name?: string }> } }
      | null;
    const frameworks = body?.results?.data ?? [];
    return {
      state: "ok",
      message: frameworks.length > 0
        ? `reachable; tracking ${frameworks[0]?.name ?? "at least one framework"}`
        : "reachable, with no frameworks configured",
      ttlSeconds: 900,
    };
  },
};

export default tenant;
