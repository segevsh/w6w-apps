/**
 * Is *this* store live, and is it a trial about to lapse?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — `service` covers the platform and `api` covers the
 *     host. This is the third, narrower question: BigCommerce can be perfectly
 *     healthy while one store is suspended for a billing reason, down for
 *     maintenance, or has simply run out of trial. Those are different problems
 *     with different fixes, and the vendor reports the last of them nowhere else.
 *   - `credential: "signed"` — unavoidable. `GET /v2/store` is authenticated, and
 *     the unauthenticated probe cannot help: BigCommerce authenticates *before*
 *     resolving the store (measured — see `health/api.ts`), so an unsigned
 *     request to a dead store and to a live one are byte-identical 401s.
 *   - `scope: "connection"` — every Connection points at a different store.
 *   - No `network.allow`: `api.bigcommerce.com` is already the app's allowlist,
 *     and a signed check may not widen egress in any case.
 *
 * ## A 403 is `unknown`, not `degraded`
 *
 * `GET /v2/store` needs the **Information & Settings** scope, and an API account
 * scoped to (say) orders only will legitimately be refused it. A refusal tells
 * you nothing about the store, so it reports `unknown` with that reason. Reading
 * it as a failure would report every correctly-narrow token as a broken store,
 * which is the exact trap that made HubSpot and Shopify pick different probes in
 * this pack.
 *
 * ## `status` is read, not inferred
 *
 * `StoreInformation.status` is a documented field ("The status of the store"),
 * but the vendor does **not** publish its value vocabulary anywhere in the
 * OpenAPI documents or the guides. So this check treats one value as good
 * (`live`) and everything else as *reported verbatim* at `degraded` rather than
 * inventing a mapping for strings it has never seen. Guessing that an unknown
 * status means "down" would be confident nonsense; hiding it would be worse.
 */
import type { HealthCheckDefinition, HealthComponentReport } from "@w6w/types";
import { normalizeStoreHash, storeBase } from "../lib/client.ts";

interface StoreInformation {
  status?: string;
  name?: string;
  plan_name?: string;
  plan_is_trial?: boolean;
}

/** The one `status` value BigCommerce's own control panel language calls healthy. */
export const LIVE_STATUS = "live";

const store: HealthCheckDefinition = {
  key: "store",
  title: "Store live",
  description:
    "Reads `status`, `plan_name` and `plan_is_trial` from GET /v2/store. Answers whether THIS " +
    "store is serving, which a platform-wide status page cannot: a store can be suspended, " +
    "under maintenance or out of trial while BigCommerce is entirely healthy.",
  kind: "dependency",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as { storeHash?: unknown };
    const hash = normalizeStoreHash(display.storeHash);
    if (!hash) return { state: "unknown", message: "connection records no store hash" };

    const res = await ctx.fetch(`${storeBase(hash)}/v2/store`, {
      headers: { accept: "application/json" },
    });

    if (res.status === 403) {
      return {
        state: "unknown",
        message: "this API account lacks the Information & Settings scope, so the store's status " +
          "cannot be read — that is a scope choice, not a problem with the store",
      };
    }
    if (res.status === 503) {
      return {
        state: "down",
        message: "503 — the store is down for maintenance, being upgraded, or suspended for an " +
          "administrative or billing reason",
      };
    }
    if (res.status === 401) {
      // The credential's own check owns this verdict; saying it twice would
      // double-count one problem across two checks.
      return { state: "unknown", message: "credential rejected — see the auth check" };
    }
    if (!res.ok) {
      return { state: "unknown", message: `BigCommerce returned ${res.status} for /v2/store` };
    }

    const body = await res.json().catch(() => null) as StoreInformation | null;
    if (!body) return { state: "unknown", message: "store information was unreadable" };

    const components: Record<string, HealthComponentReport> = {};
    const notes: string[] = [];

    const status = (body.status ?? "").trim();
    if (!status) {
      components.status = { state: "unknown", message: "store reported no status" };
      notes.push("store reported no status");
    } else if (status.toLowerCase() === LIVE_STATUS) {
      components.status = { state: "ok", message: "live" };
    } else {
      // Reported verbatim: the vocabulary is undocumented, so the string itself
      // is the most honest thing to show.
      components.status = { state: "degraded", message: `store status is "${status}"` };
      notes.push(`store status is "${status}"`);
    }

    if (body.plan_is_trial === true) {
      components.plan = {
        state: "degraded",
        message: `on a trial of ${body.plan_name ?? "an unnamed plan"} — a lapsed trial suspends ` +
          "the store and every API call with it",
      };
      notes.push("store is on a trial plan");
    } else if (body.plan_name) {
      components.plan = { state: "ok", message: body.plan_name };
    }

    const state = Object.values(components).some((c) => c.state === "degraded")
      ? "degraded"
      : Object.values(components).some((c) => c.state === "unknown")
      ? "unknown"
      : "ok";

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 300,
    };
  },
};

export default store;
