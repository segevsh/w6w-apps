/**
 * How close this key is to Statuspage's one-request-per-second ceiling —
 * declared as an absence, because Statuspage reports nothing.
 *
 * The limit itself is the tightest in this pack: *"Each API token is limited to
 * 1 request / second as measured on a 60 second rolling window."* One request a
 * second is slow enough that it shapes how a workflow should be written —
 * updating six components one at a time takes six seconds, which is why
 * `incident-create` sets component statuses in the same call and why nothing
 * here loops over components.
 *
 * But there is no way to see the remaining budget. Verified 2026-08-18 against
 * `api.statuspage.io`: responses carry no `x-ratelimit-*` header of any kind,
 * and no endpoint reports consumption. The only signal is the breach itself,
 * which arrives as **`420` or `429`** — the 420 being Statuspage's own, and
 * unusual enough that a generic client misreads it.
 *
 * Probing would spend the very budget it measures, on a limit of one per
 * second. So this states the absence, and the client turns both status codes
 * into a message that names the limit.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API request headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Statuspage reports no headroom. Its documented limit is one request per second per API " +
      "key, measured over a rolling 60-second window — the tightest in this pack — and " +
      "verified 2026-08-18 its responses carry no x-ratelimit-* header of any kind, with no " +
      "endpoint reporting consumption. The only signal is the breach, which arrives as a 420 " +
      "or a 429 (the 420 being Statuspage's own, unusual enough that a generic client misreads " +
      "it). Probing would spend the very budget it measures, against a limit of one per second, " +
      "so this app names the limit in the error instead and batches component updates into the " +
      "incident that changes them.",
  },
};

export default quota;
