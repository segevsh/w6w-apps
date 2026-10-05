/**
 * Do we have quota left? — declared absent, not guessed.
 *
 * The Apiary blueprint documents no rate limit, quota endpoint or rate-limit header, and a live
 * response from `my.demio.com/api/v1` (checked 2026-10-05, a 401 on `/ping`) carries none.
 * `unavailable` is the first-class answer per rfcs/healthcheck.md; `informational` so it never
 * pins the roll-up at `unknown`.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  description: "Not exposed: Demio documents no rate limit, quota endpoint or rate-limit headers.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "No quota endpoint or rate-limit headers are documented or observed.",
  },
};

export default quota;
