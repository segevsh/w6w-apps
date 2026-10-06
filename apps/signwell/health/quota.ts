/**
 * How much of any rate limit is left?
 *
 * Declared unavailable. SignWell does send `x-ratelimit-limit`, `x-ratelimit-remaining` and
 * `x-ratelimit-reset` (an ISO-8601 timestamp), measured 2026-10-06 on unauthenticated 401s of
 * `GET /api/v1/me`: `limit: 50`, `remaining` falling 49 → 48 across two calls, `reset` seconds
 * ahead. But the spec documents no ceiling, the window is seconds long — so the figure is a
 * burst counter that is full again before any host could act on it, not account headroom — and
 * the headers were not observed on an authenticated 200 (no key was available), so a signed
 * probe would be guessing at their shape. The only documented signal is the `429`
 * `{"error": "<limit and reset time>"}` body, which an Action surfaces when it happens.
 * `severity: "informational"` — an `unavailable` entry always reports `unknown`, and `unknown`
 * outranks `ok` in a roll-up.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "SignWell's x-ratelimit-* headers describe a seconds-long burst window (limit 50, " +
      "measured 2026-10-06 on unauthenticated 401s only), not account headroom; the spec documents " +
      "no ceiling and no usage endpoint. A 429 body names the limit and reset time when it hits.",
  },
};

export default quota;
