/**
 * Is this connection's Shopify store reachable?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — the vendor platform is covered by `service`
 *     (www.shopifystatus.com). This is the narrower question of whether THIS
 *     store answers, which a platform rollup cannot tell you: a store can be
 *     frozen, closed or renamed while Shopify itself is perfectly healthy.
 *   - `scope: "connection"` — every Connection points at a different store.
 *   - `credential: "context"` — the posture a boolean would lose. The check
 *     needs the Connection to know WHICH host to call, and needs no credential
 *     to interpret the answer. `sign` must not run.
 *   - No `network.allow` is declared: `*.myshopify.com` is already on the app's
 *     allowlist, and a `context` check is unsigned regardless.
 *   - `severity` defaults to `degraded` for this kind.
 *
 * The probe is deliberately unauthenticated, so a **401 is a pass**: it proves
 * the store's admin API is resolving and answering, which is exactly what this
 * check is for. Whether the access token is any good is the derived `auth:*`
 * check's job. Only a 404 (store gone), a 402/423 (frozen or locked) or a 5xx
 * counts against the store.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

const store: HealthCheckDefinition = {
  key: "store",
  title: "Store reachable",
  description:
    "Unauthenticated request to this connection's store admin API. A 401 passes — it proves the store is serving; token validity is the `auth:*` check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { shop?: string };
    if (!display.shop) return { state: "unknown", message: "connection records no store handle" };

    const res = await ctx.fetch(`${baseUrl(display.shop)}/shop.json`);
    if (res.status === 404) {
      return { state: "down", message: "store not found — it may have been closed or renamed" };
    }
    if (res.status === 402 || res.status === 423) {
      return { state: "down", message: `store is frozen or locked (${res.status})` };
    }
    if (res.status >= 500) {
      return { state: "down", message: `store returned ${res.status}` };
    }
    // 200 and 401 both mean the store is serving. That is the whole question.
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default store;
