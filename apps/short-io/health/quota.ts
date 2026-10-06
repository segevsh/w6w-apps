import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "Short.io publishes rate limits only as prose in individual operation descriptions " +
      "(for example 20/s on link get/update/delete, 50/s on link create and duplicate, 1/s on " +
      "bulk delete, 5 queries per 10 seconds on bulk create) and sends no rate-limit headers: " +
      "the OpenAPI document declares no response headers and a live 401 carries none. The only " +
      "signal is the 429 itself, and there is no endpoint that reports remaining headroom.",
  },
};

export default quota;
