import type { HealthCheckDefinition } from "@w6w/types";
import { type EntityState, isUsable, urlFromConnection } from "../lib/client.ts";

/**
 * How much of this instance is actually working.
 *
 * ## The failure Home Assistant does not report as a failure
 *
 * When an integration breaks — a vendor's cloud API changes, a device drops off
 * the network, an OAuth token expires — Home Assistant does not raise anything.
 * Its entities simply start reporting the string `"unavailable"`, and the
 * instance carries on looking healthy. Every other check here would pass: the
 * API answers, the token is valid, the state is `RUNNING`.
 *
 * A workflow reading `sensor.freezer_temperature` gets `"unavailable"`,
 * `Number()` makes it `NaN`, and a comparison against a threshold is false — so
 * the alert that was supposed to fire when the freezer got warm silently never
 * fires at all. That is the specific outcome this check exists to make visible.
 *
 * ## What the thresholds mean
 *
 * Some unavailable entities are normal: a phone that is off the network, a
 * device that is unplugged for the season, a `update` entity between polls. A
 * handful is background noise; a quarter of the instance is an integration that
 * has fallen over. So this reports a proportion rather than a count, and names
 * the domains it is concentrated in — because "all fourteen are `light`" points
 * straight at which integration to look at, and `error-log` says why.
 */
const entities: HealthCheckDefinition = {
  key: "entities",
  title: "Entities reporting",
  description:
    "What proportion of entities read `unavailable` or `unknown`. A broken integration raises " +
    "nothing — its entities just stop having values, and threshold comparisons silently go false.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  severity: "informational",
  minIntervalSeconds: 600,

  async check(_input, ctx) {
    let base: string;
    try {
      base = urlFromConnection(ctx.connection);
    } catch {
      return { state: "unknown", message: "this connection has no Home Assistant URL recorded" };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/api/states`, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "down", message: `could not reach Home Assistant: ${String(err)}` };
    }
    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel();
      return { state: "unknown", message: "the access token was rejected" };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "down", message: `Home Assistant answered ${res.status}` };
    }

    const body = await res.json().catch(() => null) as EntityState[] | null;
    if (!Array.isArray(body)) {
      return { state: "unknown", message: "the states endpoint did not return a list" };
    }
    if (body.length === 0) {
      return {
        state: "degraded",
        message: "the instance reports no entities at all — normal only for a fresh install, and " +
          "otherwise what a still-starting instance looks like",
      };
    }

    const broken = body.filter((entity) => !isUsable(entity?.state));
    const proportion = broken.length / body.length;

    if (broken.length === 0) {
      return {
        state: "ok",
        message: `all ${body.length} entities are reporting`,
        ttlSeconds: 600,
      };
    }

    // Which domains, because that points at the integration to look at.
    const byDomain = new Map<string, number>();
    for (const entity of broken) {
      const domain = String(entity?.entity_id ?? "").split(".")[0];
      if (domain) byDomain.set(domain, (byDomain.get(domain) ?? 0) + 1);
    }
    const worst = [...byDomain.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([domain, count]) => `${domain} (${count})`).join(", ");

    const detail = `${broken.length} of ${body.length} entities unavailable — ${worst}`;
    // A few is normal: a phone off the network, a seasonal device unplugged.
    if (proportion >= 0.25) {
      return {
        state: "down",
        message: `${detail}. At this proportion an integration has fallen over — \`error-log\` ` +
          "says which",
        ttlSeconds: 600,
      };
    }
    if (proportion >= 0.05) {
      return { state: "degraded", message: detail, ttlSeconds: 600 };
    }
    return {
      state: "ok",
      message: `${detail}, which is within normal background`,
      ttlSeconds: 600,
    };
  },
};

export default entities;
