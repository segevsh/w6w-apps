import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Webex documents throttling only in prose — every 4xx/5xx entry in the
 * vendor's own OpenAPI reference (checked across the People, Rooms, Messages,
 * Memberships, Teams, Team Memberships and Webhooks operations on 2026-09-29)
 * describes `429` as "Too Many Requests... A `Retry-After` header should be
 * present", but no operation documents a remaining-quota header or a
 * headroom endpoint, and a live unauthenticated `GET /people/me` carried no
 * `RateLimit-*` / `X-RateLimit-*` header of any kind on its `401`. There is
 * nothing to read ahead of a `429` — only `Retry-After` after the fact, which
 * this app's `WebexClient` already surfaces inside a thrown error's message.
 *
 * Declared rather than omitted, so a host can tell "we checked, there is
 * nothing" from "nobody looked". `severity: "informational"` — an
 * `unavailable` entry reports `unknown`, and an informational check never
 * worsens a roll-up verdict.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Webex documents rate limiting only as a 429 + Retry-After response; no operation " +
      "documents a remaining-quota header or a headroom endpoint, and none was observed on a " +
      "live probe.",
  },
};

export default quota;
