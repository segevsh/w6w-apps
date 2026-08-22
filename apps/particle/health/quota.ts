import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Rate-limit headroom — declared **unavailable**.
 *
 * Particle publishes no rate-limit header: probed live 2026-08-19, a response
 * carries no `x-ratelimit-*`, no `ratelimit` and no `retry-after` before a 429.
 * Its documented limits are **per endpoint** — different for reading a
 * variable, calling a function and publishing an event — so there is no single
 * number to sample even in principle.
 *
 * ## And the budget that actually runs out is cellular data
 *
 * For a fleet on cellular, the constraint is not requests to this API. It is
 * megabytes on the SIM: a device with a firmware bug publishing every second
 * instead of every hour looks connected, responsive and healthy, and shows up
 * weeks later as a data bill — or, sooner, as a SIM that has passed its limit
 * and stopped passing traffic, which silences the device and looks exactly like
 * an outage.
 *
 * `sim-list` reports data used per SIM and flags the ones over their limit,
 * which is the honest version of "how much headroom is left" for this app.
 */
const check: HealthCheckDefinition = {
  key: "quota",
  kind: "quota",
  scope: "connection",
  credential: "none",
  title: "Rate-limit headroom",
  description:
    "Not checkable. Particle publishes no rate-limit header and its limits are PER ENDPOINT, so " +
    "there is no single number. The budget that actually runs out on a cellular fleet is DATA — " +
    "`sim-list` reports that, and flags SIMs cut off for exceeding it.",
  covers: ["quota"],
  severity: "informational",
  unavailable: {
    reason: "Particle returns no rate-limit header of any kind — verified live 2026-08-19: no " +
      "`x-ratelimit-*`, no `ratelimit`, no `retry-after` before a 429. Its documented limits are " +
      "per endpoint rather than per account, so no single figure would describe them. More to " +
      "the point, the budget that runs out on a cellular fleet is DATA, not requests: a device " +
      "publishing far more often than intended looks healthy and responsive, and surfaces weeks " +
      "later as a bill — or as a SIM past its limit that has stopped passing traffic, silencing " +
      "the device in a way that looks like an outage. `sim-list` reports per-SIM usage and flags " +
      "the ones cut off, which is the version of this question that can be answered.",
  },
};

export default check;
