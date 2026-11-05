import type { HealthCheckDefinition } from "@w6w/types";

export default {
  key: "quota",
  title: "DICE quota headroom",
  kind: "quota",
  severity: "informational",
  unavailable: {
    reason:
      "The public Ticket Holders API reference does not document a quota/headroom endpoint; no headroom headers were observed on unauthenticated probes.",
  },
} satisfies HealthCheckDefinition;
