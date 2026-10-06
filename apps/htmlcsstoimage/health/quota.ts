import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Image credit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "HTML/CSS to Image meters image credits per plan, but exposes no remaining count: " +
      "GET /v1/usage returns images created per hour, day, month and billing period with no " +
      "plan ceiling, and no response header reports headroom. Image creation has no " +
      "per-second or per-minute rate limit (docs, 'Rate limits'); running out of credits " +
      "surfaces only as a 402 on POST /v1/image. Usage so far is readable with the " +
      "`usage-get` action.",
  },
};

export default quota;
