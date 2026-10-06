import type { HealthCheckDefinition } from "@w6w/types";

/**
 * xAI publishes no readable quota: `openapi.json` (38 paths, checked 2026-10-06) declares no
 * rate-limit response header and no usage or balance endpoint, and the 401/400 replies
 * measured carry only Cloudflare headers. `GET /v1/api-key` describes the key itself and is
 * never probed.
 *
 * `severity: "informational"` is load-bearing: without it the permanent `unknown` this check
 * reports would pin the app's verdict there forever.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "xAI's API documents no rate-limit header, usage endpoint or balance endpoint, " +
      "so there is no headroom to read.",
  },
};

export default quota;
