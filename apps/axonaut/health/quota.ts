import type { HealthCheckDefinition } from "@w6w/types";

/**
 * The API documentation publishes no rate limit, no rate-limit response header and no usage
 * endpoint (the OpenAPI document has none; `/me` reports an `api_time_consumed` counter but
 * returns the caller's own key, so it is not read). Headroom is not observable.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Axonaut documents no rate limit and exposes no rate-limit headers or usage " +
      "endpoint that is safe to read (`/me` echoes the API key).",
  },
};

export default quota;
