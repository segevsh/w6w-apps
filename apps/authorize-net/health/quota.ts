import type { HealthCheckDefinition } from "@w6w/types";
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "The Authorize.Net API reference does not expose remaining API quota or rate-limit headroom.",
  },
};
export default quota;
