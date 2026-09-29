/**
 * Declared absence: kvCORE publishes no readable rate-limit or quota signal.
 *
 * Checked two ways on 2026-09-29: the vendor's OpenAPI document (embedded in
 * `developer.insiderealestate.com`'s reference pages) contains no mention of
 * a rate-limit header or a usage/quota endpoint anywhere in its ~50 paths,
 * and a live `401` response from `api.kvcore.com` carries no `X-RateLimit-*`
 * (or any other quota-shaped) header among the ones it does send
 * (`content-type`, `set-cookie`, `server`, `cache-control`,
 * `access-control-*`, `cf-cache-status`, `cf-ray`). The vendor's own
 * "Request Paging" standard documents a page-size ceiling (500 records per
 * page), which is a per-call limit, not a consumable quota — there is
 * nothing here to read headroom from.
 *
 * `informational` per the spec: `unavailable` always reports `unknown`, which
 * outranks `ok` in a roll-up, so anything less forgiving would pin this
 * App's health at `unknown` forever over a signal that was never promised.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason: "kvCORE's OpenAPI document names no rate-limit header or quota endpoint, and a live " +
      "response carries no X-RateLimit-* (or equivalent) header.",
  },
};

export default quota;
