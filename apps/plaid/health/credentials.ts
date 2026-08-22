/**
 * Are **these** credentials live in **this** environment?
 *
 * Plaid's failure modes are unusually easy to confuse, and this check exists to
 * separate the one the connection owns from the one an Item owns:
 *
 *   - a **production secret used against sandbox** (or the reverse) answers
 *     `INVALID_API_KEYS` — a connection problem, and the commonest setup
 *     mistake, since the client id is the same in both environments and only
 *     the secret differs;
 *   - a **user's expired bank login** answers `ITEM_LOGIN_REQUIRED` — which is
 *     not a connection problem at all, affects one Item, and is repaired by
 *     that user re-authenticating.
 *
 * So this probes `/institutions/get`, which needs no Item: it can only fail for
 * connection-level reasons, which makes its answer unambiguous. Per-Item health
 * is `item-get`'s job.
 *
 * It also reports the rate-limit posture honestly. Plaid meters per client id
 * and per endpoint, and publishes no headroom — the ceiling shows up as a
 * `RATE_LIMIT_EXCEEDED` error and nowhere else.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { displayOf, hostFor } from "../lib/client.ts";

const credentials: HealthCheckDefinition = {
  key: "credentials",
  title: "Credentials and environment",
  description:
    "Probes an Item-free endpoint, so a failure can only mean the connection is wrong — most " +
    "often a secret from the other environment. Per-Item errors are a different question.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const environment = displayOf(ctx.connection).environment ?? "sandbox";
    const base = hostFor(environment);

    let res: Response;
    try {
      // The credentials are injected into the body by the auth `sign` hook.
      res = await ctx.fetch(`${base}/institutions/get`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ count: 1, offset: 0, country_codes: ["US"] }),
      });
    } catch (err) {
      return { state: "down", message: `could not reach ${base}: ${String(err)}` };
    }

    const text = await res.text().catch(() => "");
    if (res.ok) {
      return { state: "ok", message: `Plaid ${environment} credentials live`, ttlSeconds: 300 };
    }

    const body = (() => {
      try {
        return JSON.parse(text) as { error_code?: string; error_message?: string };
      } catch {
        return {} as { error_code?: string; error_message?: string };
      }
    })();

    if (body.error_code === "INVALID_API_KEYS") {
      return {
        state: "down",
        message:
          `Plaid rejected these credentials for the ${environment} environment — the secret ` +
          "differs per environment even though the client id does not",
      };
    }
    if (body.error_code === "RATE_LIMIT_EXCEEDED") {
      return {
        state: "degraded",
        message: "rate limited — Plaid meters per client id and per endpoint, and publishes no " +
          "headroom",
      };
    }
    return {
      state: "down",
      message: `${body.error_code ?? res.status}: ${body.error_message ?? text.slice(0, 120)}`,
    };
  },
};

export default credentials;
