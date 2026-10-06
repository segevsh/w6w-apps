import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Hex documents rate-limit groups (hex-api: 30/min and 1,800/hour by default, hex-run-kernel for run starts, limits that may vary per workspace) but publishes no remaining-count header or usage endpoint, so headroom cannot be read, only budgeted.",
  },
};

export default quota;
