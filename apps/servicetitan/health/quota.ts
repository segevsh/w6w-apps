/**
 * Do we have rate-limit headroom left? — declared absent, not guessed.
 *
 * ServiceTitan's spec documents no `X-RateLimit-*` response header on any of the
 * four modules read (CRM, JPM, Settings, Dispatch) and exposes no usage
 * endpoint; the only usage signal is a `429`, which a side-effect-free probe
 * would have to provoke. `unavailable` with `informational` severity is the
 * honest declaration (rfcs/healthcheck.md "Declaring absence") and keeps the
 * roll-up from sitting at `unknown`.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Rate-limit headroom",
  description:
    "Not exposed: ServiceTitan's spec documents no rate-limit response header or usage endpoint.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "No rate-limit response header or quota endpoint is documented in the API reference.",
  },
};

export default quota;
