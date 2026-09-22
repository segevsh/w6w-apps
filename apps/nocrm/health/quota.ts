import type { HealthCheckDefinition } from "@w6w/types";

/**
 * How much rate-limit headroom is left — nothing readable exists to report.
 *
 * noCRM's API document (Errors section, read 2026-09-22) describes only the
 * **refusal**: on a `429` it sets two response headers, `API-RETRY-AFTER` and
 * `API-LIMIT-RESET`, "to let you know when you can restart doing requests", and
 * warns that requests which are not stopped "might deactivate the API key used
 * or blocked the account".
 *
 * There is no documented header carrying **remaining** allowance on a normal
 * (non-429) response, and no endpoint that reports it — so a `kind: "quota"`
 * check would have to invent either one. The app therefore reports no quota
 * figure and says so, and `lib/client.ts`'s error formatter repeats the
 * documented backoff guidance on a 429 instead.
 *
 * `severity: "informational"` — an `unavailable` entry reports `unknown`, and an
 * informational check never worsens a roll-up verdict. Declaring it keeps the app
 * off a permanent `unknown`, which is what omitting the check entirely would
 * cause.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason: "noCRM documents no rate-limit header on a normal response and no endpoint reporting " +
      "remaining allowance. Its Errors section says only that a 429 carries API-RETRY-AFTER " +
      "and API-LIMIT-RESET to say when requests may resume, and that continuing to call a " +
      "throttled API may deactivate the API key or block the account (read 2026-09-22), so " +
      "headroom can only be budgeted from observed 429s, never read in advance.",
  },
};

export default quota;
