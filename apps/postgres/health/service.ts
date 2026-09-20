import type { HealthCheckDefinition } from "@w6w/types";
import { encodeQuery, FrameReader, parseErrorResponse } from "../lib/wire.ts";

/**
 * Runs a `SELECT 1`-equivalent over the SAME `ctx.socket` an action would
 * use — real SCRAM already happened before this hook ever runs (the host
 * opens and handshakes the socket before handing it to any credential-bearing
 * hook, action or health check alike), so this is a genuine liveness probe,
 * not a shape check.
 *
 * ## Why this exists alongside `auth/postgres.ts`'s `test` hook
 *
 * `test` can only validate that a username/password LOOK plausible — no
 * auth-phase hook ever gets `ctx.socket` (Hook Runtime RFC's sandbox posture
 * table), so it cannot tell you the server is actually reachable or the
 * password is actually correct. This check is what closes that gap: it is
 * declared `credential: "signed"` so the host hands it a real, connected
 * socket the same way it does for `execute`.
 *
 * ## `kind: "dependency"`, not `"service"` or `"credential"`
 *
 * There is no vendor SaaS platform behind this App to ask "is Postgres up?"
 * — the thing being probed is one tenant's own database, the same shape as
 * a self-hosted WordPress install or a partner's own host (`rfcs/
 * healthcheck.md`'s `dependency` row: "Is a thing this App depends on
 * reachable?"). `auth/postgres.ts`'s derived `auth:postgres` check already
 * covers credential-shape liveness; this one covers "can we actually reach
 * and talk to the database right now."
 *
 * ## `severity: "informational"`
 *
 * Deliberately below the `kind !== "credential"` default of `"degraded"`.
 * The derived `auth:postgres` check is already `fatal` for the credential
 * itself; this check adds a second, more failure-prone signal (network
 * blips, a database mid-restart) on top of it, and a health check that can
 * only ever answer `unknown` (see below) is worse than none — this one is
 * meant to genuinely discriminate `ok` from `down`, but its failure should
 * not by itself drag a connection's overall roll-up to `fatal`.
 *
 * ## The one caveat: `ctx.socket` presence for a HEALTH check
 *
 * `HookContext.socket` is documented in `@w6w/types` as present "only for
 * action `execute`" — and, verified by reading `packages/runtime/src/
 * health.ts`'s `runHealthHook`, the reference host's own `checkHealth()`
 * convenience function never opens one for ANY health check today (declared
 * or promoted-from-Action alike): only `invoke()`'s action path calls
 * `openConnectionSocket`. That is a genuine gap in the current runtime
 * surface, not something this App can fix (`packages/core` is out of this
 * node's scope) — reported in this node's result rather than patched here.
 * `check` below handles the gap honestly: `state: "unknown"` (never `"down"`,
 * which would claim a fact about the database this check did not actually
 * observe) when no socket was handed to it, so a future host that DOES wire
 * a socket into a health-check invocation starts reporting real `ok`/`down`
 * with no change to this file. The golden-path test drives this hook with a
 * REAL socket directly (composing the same `openConnectionSocket` +
 * `runHook` primitives `invoke()` itself uses), proving the actual probe
 * logic below against the live server.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Database reachable",
  description: "Runs SELECT 1 over an authenticated connection to confirm the database actually " +
    "answers queries, not just that the stored credential looks well-formed.",
  kind: "dependency",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  severity: "informational",

  async check(_input, ctx) {
    if (!ctx.socket) {
      return {
        state: "unknown",
        message: "No authenticated connection was made available to this check.",
      };
    }

    try {
      await ctx.socket.write(encodeQuery("select 1"));

      const reader = new FrameReader();
      while (true) {
        let frame = reader.next();
        while (frame === null) {
          const chunk = await ctx.socket.read();
          if (chunk === null) {
            return { state: "down", message: "Connection closed before the probe completed." };
          }
          reader.push(chunk);
          frame = reader.next();
        }

        if (frame.type === "E") {
          return { state: "down", message: parseErrorResponse(frame).message };
        }
        if (frame.type === "Z") {
          return { state: "ok" };
        }
        // RowDescription / DataRow / CommandComplete / other frames — the
        // probe only cares that the exchange completes cleanly.
      }
    } catch (err) {
      return {
        state: "down",
        message: (err as Error)?.message ?? "The database could not be reached.",
      };
    }
  },
};

export default service;
