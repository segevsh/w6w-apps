/**
 * Do we have API usage headroom left? — declared absent, not guessed.
 *
 * OneSimpleApi tracks usage percentage and a monthly reset day, but that data
 * is only exposed as server-rendered props on the logged-in dashboard
 * (Inertia.js `subscription` props on `/docs` and other pages — `api_percentage`,
 * `remaining`, `reset_day`), not through any documented API endpoint. None of
 * the 16 documented API endpoints return a quota/remaining-requests field or a
 * rate-limit response header (checked 2026-08-01 against every doc page under
 * `/docs`). There is nothing a side-effect-free API probe can read.
 *
 * `unavailable` is the honest answer per rfcs/healthcheck.md "Declaring
 * absence". `severity: "informational"` so it never pins the roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API usage headroom",
  description:
    "Not exposed via the API: usage percentage is dashboard-only (Inertia page props), with no documented API endpoint or response header.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Usage/quota data (api_percentage, remaining, reset_day) is only rendered on the logged-in dashboard, not exposed through any documented API endpoint or header.",
  },
};

export default quota;
