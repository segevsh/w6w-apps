/**
 * Do we have quota left? — declared unavailable.
 *
 * Verified against https://developers.figma.com/docs/rest-api/rate-limits/:
 * Figma does not return remaining-quota headers on successful (2xx)
 * responses. The only rate-limit signal it exposes — `Retry-After`,
 * `X-Figma-Plan-Tier`, `X-Figma-Rate-Limit-Type`, `X-Figma-Upgrade-Link` —
 * rides on a `429` response, i.e. *after* the caller has already been
 * throttled. That tells you what just happened, not how much headroom is
 * left before it happens, so there is nothing this check could read from a
 * healthy request that would answer "will the next hundred calls succeed".
 *
 * Per rfcs/healthcheck.md, declaring absence honestly (`unavailable`) is the
 * better answer over a check that either lies (reports `ok` from a probe that
 * proves nothing) or silently doesn't exist. `severity: "informational"` so
 * the permanent `unknown` this produces never worsens a roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason: "Figma exposes no rate-limit headers on successful responses. Retry-After / " +
      "X-Figma-Plan-Tier / X-Figma-Rate-Limit-Type only appear on an already-returned " +
      "429, so there is no proactive headroom signal to probe.",
  },
};

export default quota;
