import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Ecwid publishes no readable quota headroom, so this declares `unavailable`
 * with a reason rather than pretending to probe — a positive fact, not an
 * omission.
 *
 * `severity: "informational"` is load-bearing. An `unavailable` entry always
 * reports `unknown`, and `unknown` outranks `ok` in the roll-up, so at any other
 * severity a declared absence would pin every verdict at `unknown` forever.
 *
 * ## What Ecwid meters, and why neither half is readable
 *
 * The only limit the vendor documents is **600 requests/minute per token**
 * (`api-reference/rest-api/rest-api-overview.md`): "If you exceed the limit,
 * all subsequent requests will be ignored with
 * an error 429 and a **Retry-After: N** header (number N is a cooldown)." That
 * is a refusal, not a reading — the remaining count is never published, before
 * or after the request, and no header carries it. There is no credit balance,
 * spend ceiling or usage endpoint anywhere in the REST API reference (the
 * closest thing, `GET /profile` with `showExtendedInfo` and the account
 * reports under `store-profile/store-reports`, reports past *activity* rather
 * than a remaining allowance).
 *
 * So a workflow can budget its calls, and it can react to a `429` — which this
 * app's client reports with the vendor's own `Retry-After` value — but nothing
 * here can answer "how much headroom is left", and inventing a probe that
 * reported the ceiling as though it were the balance would be worse than
 * saying so.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Quota headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Ecwid publishes no readable headroom. The only documented limit is 600 requests/minute " +
      "per token, signalled only by a 429 carrying `Retry-After` in seconds — no remaining " +
      "count is ever published, and no header or endpoint reports a balance, spend ceiling or " +
      "usage figure. A workflow can budget calls and react to the 429 (this app's client " +
      "surfaces the vendor's own `Retry-After`), but 'how much is left' cannot be read.",
  },
};

export default quota;
