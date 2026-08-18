import type { HealthCheckDefinition } from "@w6w/types";
import {
  describeError,
  eventsHostFor,
  normalizeUrl,
  type OnePasswordConnectionDisplay,
  surfaceOf,
} from "../lib/client.ts";

/**
 * Is whichever service this connection points at answering — and does the
 * credential still reach what it used to?
 *
 * ## One check, two very different probes
 *
 * A connection is either Connect or Events, and they fail for different reasons
 * and in different places. Rather than a check that is meaningless on half the
 * connections, this reads the connection's own surface and probes accordingly:
 *
 * - **Connect** — `GET /v1/vaults`, which answers with the vaults the token is
 *   scoped to.
 * - **Events** — `GET /api/auth/introspect`, which answers with the event kinds
 *   the token is granted.
 *
 * ## The scope shrinking is the interesting failure
 *
 * Both probes return a *scope*, and both scopes can shrink without anything
 * failing. A Connect token whose vault was deleted still authenticates and now
 * reaches fewer vaults. An Events token whose grants were narrowed still works
 * on the endpoints it kept.
 *
 * Neither raises an error anywhere — the workflow simply starts getting 404s
 * and 403s that look like bugs. So this compares the current scope against what
 * was recorded at connect time, and reports a reduction as `degraded` rather
 * than waiting for something to break.
 *
 * An empty scope is `down`: a token that can reach nothing is not a working
 * connection, however valid it is.
 */
const surface: HealthCheckDefinition = {
  key: "surface",
  title: "Credential scope",
  description:
    "Whether this connection's service answers and its credential still reaches what it did. A " +
    "scope that shrank keeps authenticating and starts returning 404s that look like bugs.",
  kind: "credential",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as OnePasswordConnectionDisplay & {
      features?: string[];
    };
    const kind = surfaceOf(ctx.connection);

    if (kind === "events") {
      let host: string;
      try {
        host = eventsHostFor(display.region);
      } catch (err) {
        return { state: "unknown", message: String(err) };
      }

      let res: Response;
      try {
        res = await ctx.fetch(`${host}/api/auth/introspect`, {
          headers: { accept: "application/json" },
        });
      } catch (err) {
        return { state: "down", message: `could not reach ${host}: ${String(err)}` };
      }
      const text = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403) {
        // The derived auth check owns credential failures.
        return { state: "unknown", message: "the Events token was rejected" };
      }
      if (!res.ok) {
        return { state: "down", message: describeError(res.status, text, "events") };
      }

      const body = JSON.parse(text) as { Features?: string[] };
      const features = body?.Features ?? [];
      if (features.length === 0) {
        return {
          state: "down",
          message: "this token is granted no event kinds, so every action will 403",
        };
      }
      const before = display.features ?? [];
      if (before.length > 0 && features.length < before.length) {
        const lost = before.filter((feature) => !features.includes(feature));
        return {
          state: "degraded",
          message: `this token has lost grants since it was connected: ${lost.join(", ")}. The ` +
            "actions for those will 403 while the rest keep working",
        };
      }
      return {
        state: "ok",
        message: `granted: ${features.join(", ")}`,
        ttlSeconds: 300,
      };
    }

    // Connect.
    let base: string;
    try {
      base = normalizeUrl(display.url);
    } catch {
      return { state: "unknown", message: "this connection has no Connect server URL recorded" };
    }
    const host = new URL(base).host;

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/v1/vaults`, { headers: { accept: "application/json" } });
    } catch (err) {
      return {
        state: "down",
        message: `${host} did not answer: ${String(err)}. Connect runs on your own ` +
          "infrastructure, so this is a reachability question rather than a 1Password one",
      };
    }
    const text = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      return { state: "unknown", message: "the Connect token was rejected" };
    }
    if (!res.ok) {
      return { state: "down", message: `${host}: ${describeError(res.status, text, "connect")}` };
    }

    let vaults: unknown[] = [];
    try {
      vaults = JSON.parse(text) as unknown[];
    } catch {
      return {
        state: "degraded",
        message: `${host} answered without JSON — usually a proxy or another service on that port`,
      };
    }
    if (!Array.isArray(vaults) || vaults.length === 0) {
      return {
        state: "down",
        message: "this token now reaches no vaults, so every item action will 404",
      };
    }

    const before = Number(display.vaultCount ?? 0);
    if (before > 0 && vaults.length < before) {
      return {
        state: "degraded",
        message: `this token reached ${before} vaults when it was connected and reaches ` +
          `${vaults.length} now. Item lookups in the missing ones will 404, which looks like a ` +
          "wrong id rather than a scope change",
      };
    }

    return {
      state: "ok",
      message: `${host} is answering — ${vaults.length} vault${
        vaults.length === 1 ? "" : "s"
      } in scope`,
      ttlSeconds: 300,
    };
  },
};

export default surface;
