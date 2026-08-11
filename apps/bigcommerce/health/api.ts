/**
 * Is the BigCommerce API itself answering, independently of what the status page
 * claims?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — the vendor rollup is covered by `service`
 *     (status.bigcommerce.com). This is the narrower question of whether
 *     `api.bigcommerce.com` is serving *right now*, which a status page cannot
 *     answer: a status page is a human-updated document and lags an incident by
 *     minutes.
 *   - `credential: "context"` — the posture a boolean would lose. The check needs
 *     the Connection to know which store path to call, and needs **no** credential
 *     to interpret the answer. `sign` must not run.
 *   - No `network.allow` is declared: `api.bigcommerce.com` is already the app's
 *     allowlist, and a `context` check is unsigned regardless.
 *   - `severity` defaults to `degraded` for this kind.
 *
 * ## Why a 401 is a PASS, and what this check deliberately does NOT claim
 *
 * The probe is unauthenticated on purpose, and the interpretation rests on a
 * measurement rather than a guess. On 2026-08-11, against
 * `https://api.bigcommerce.com/stores/abc123/…` with **no** `X-Auth-Token`:
 *
 *   | Request                                | Status | Body                                  |
 *   | -------------------------------------- | ------ | ------------------------------------- |
 *   | `GET /v2/time` (a real route)          | 401    | `X-Auth-Token header is required`     |
 *   | `GET /v3/definitely-not-real-zzz`      | 404    | `The route is not found, check the URL` |
 *
 * So BigCommerce resolves the **route** before authenticating, which makes that
 * 401 a positive proof that the API is up and serving this exact path. But it
 * authenticates **before** resolving the store — `abc123` is not a real store and
 * the answer was still 401 — so this check **cannot** tell you the store hash is
 * right, and it does not pretend to. Whether the credential and the store hash
 * are any good is the derived `auth:*` check's job. Conflating the two is how
 * "BigCommerce is having an incident" gets misreported as "your token expired".
 *
 * A 404 here would mean BigCommerce stopped serving `/v2/time` — a real,
 * reportable change, and the reason the probe is a fixed known route rather than
 * a random one.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { normalizeStoreHash, storeBase } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description:
    "Unauthenticated request to GET /v2/time on api.bigcommerce.com. A 401 passes — it proves " +
    "the API is resolving and serving this route. It cannot and does not check the store hash " +
    "or the token; that is the `auth:*` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { storeHash?: unknown };
    const hash = normalizeStoreHash(display.storeHash);
    if (!hash) return { state: "unknown", message: "connection records no store hash" };

    const res = await ctx.fetch(`${storeBase(hash)}/v2/time`, {
      headers: { accept: "application/json" },
    });

    if (res.status === 401) {
      // The whole point of the check: the route resolved and the API answered.
      return { state: "ok", ttlSeconds: 120 };
    }
    if (res.status === 200) {
      // Not expected without a credential, but a served response is a served
      // response — the question this check asks is answered either way.
      return { state: "ok", ttlSeconds: 120 };
    }
    if (res.status === 404) {
      return {
        state: "down",
        message: "api.bigcommerce.com no longer serves /v2/time for this store path",
      };
    }
    if (res.status === 503) {
      return {
        state: "down",
        message: "503 — the store is down for maintenance, being upgraded, or suspended for an " +
          "administrative or billing reason",
      };
    }
    if (res.status === 429) {
      // The quota is shared store-wide, so this says the store is busy, not that
      // the API is broken.
      return {
        state: "degraded",
        message: "429 — the store's shared 30-second request quota is exhausted",
      };
    }
    if (res.status >= 500) {
      return { state: "down", message: `api.bigcommerce.com returned ${res.status}` };
    }
    return { state: "unknown", message: `api.bigcommerce.com returned ${res.status}` };
  },
};

export default api;
