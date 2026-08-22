/**
 * How much is left — for Replicate the question does not have the shape this
 * check normally assumes, and saying that is more useful than a number.
 *
 * **Replicate bills by compute, not by request.** A prediction costs whatever
 * the hardware costs for as long as the model runs, so "requests remaining" is
 * not a meaningful ceiling: an account can make a thousand cheap calls or one
 * expensive one. Verified 2026-08-18 against
 * `https://api.replicate.com/openapi.json`:
 *
 *   - **No rate-limit response header is declared anywhere** in the document,
 *     and none appears on a live `401`.
 *   - **No usage, credit or spend endpoint exists.** `GET /account` returns the
 *     username, type and GitHub URL — no balance.
 *   - The only capacity signal is a `429`, which the client raises with
 *     Replicate's problem-details envelope intact.
 *
 * The number that *does* matter — what a prediction cost — is per prediction
 * rather than per account: `prediction-get` returns `metrics.predict_time`, and
 * that multiplied by the hardware's rate is the bill. `hardware-list` is where
 * the rates are named. So the cost question is answered where it is actually
 * askable, and this check declines to invent an allowance.
 *
 * `severity: "informational"` because an `unavailable` entry always reports
 * `unknown`, and an informational check never worsens a roll-up verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Account headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Replicate bills by compute time rather than by request, so there is no request allowance " +
      "to report. Verified 2026-08-18: its OpenAPI document declares no rate-limit response " +
      "header anywhere, none appears on a live response, and there is no usage, credit or spend " +
      "endpoint — GET /account returns the username and type only. What a prediction cost is " +
      "per prediction, in `metrics.predict_time` on the prediction itself.",
  },
};

export default quota;
