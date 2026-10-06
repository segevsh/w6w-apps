import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Rocket.Chat's API reference documents no usage endpoint or rate-limit header, and the " +
      "limits are workspace settings an admin can change, so 'how much is left' cannot be read.",
  },
};

export default quota;
