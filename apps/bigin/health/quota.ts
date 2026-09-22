/**
 * How much of the 24-hour API credit allowance is left on THIS connection.
 *
 * Annotation:
 *
 *   - `kind: "quota"`. The derived `auth:oauth2` check already answers "is the
 *     credential live"; this answers "will the next hundred calls succeed".
 *   - `scope: "connection"` and `credential: "signed"` are this kind's defaults
 *     and both are correct: the allowance belongs to the account behind the
 *     credential, and reading it needs the credential on the wire. Signing is
 *     safe because the probe stays on the app's own egress allowlist
 *     (`www.zohoapis.*`) — this check declares no `network.allow` of its own,
 *     which the spec forbids alongside a signed posture.
 *   - `severity: "informational"` — running low is worth showing and never
 *     worth failing a verdict over.
 *
 * Probe: `GET /bigin/v2/users?type=CurrentUser` — the cheapest authenticated
 * call this app knows: one credit per Bigin's own Credit Deduction table, and
 * it needs only `ZohoBigin.users.READ`, the same scope the `oauth2` auth
 * method's `test` hook probes. `/users?type=CurrentUser` and the quota check
 * therefore share one path constant (`lib/users.ts`).
 *
 * `X-API-CREDITS-REMAINING` is **not named anywhere in Bigin's API Limits page**
 * (https://www.bigin.com/developer/docs/apis/v2/api-limits.html documents the
 * credit counts and the concurrency limits, no response headers) — the header
 * belongs to the Zoho platform generation Bigin shares with Zoho CRM, whose
 * quota check this one mirrors. Two consequences are stated plainly rather than
 * papered over:
 *
 *   - **A missing header is `ok`, not `unknown`.** For this header family Zoho
 *     only sends it once usage crosses 50% of the day's allowance, so absence
 *     means "plenty of headroom", which is itself the answer. A probe that
 *     reported `unknown` on the normal case would sit at `unknown` forever.
 *   - The check is therefore best-effort reporting: it surfaces a real number
 *     when Bigin sends one and stays quiet when it does not. Nothing is
 *     invented in between — an unparseable value is `unknown`, and a probe that
 *     fails outright is `unknown`, never a made-up figure.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_PREFIX, apiDomainFromConnection } from "../lib/client.ts";
import { CURRENT_USER_PATH } from "../lib/users.ts";

/**
 * Bigin's 24-hour allowance is 5,000 credits on the Free edition and 50,000+
 * (up to 100,000) on paid ones — the same order of magnitude as Zoho CRM's, so
 * the sibling's thresholds carry over: a thousand credits left is under a
 * fifth of the smallest plan, worth a warning and not an alarm.
 */
const headroom = (remaining: number): HealthState => {
  if (remaining <= 0) return "down";
  if (remaining < 1000) return "degraded";
  return "ok";
};

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API credit headroom",
  description:
    "Reads `X-API-CREDITS-REMAINING` off the cheapest authenticated call (`GET /users?type=CurrentUser`). Zoho only sends this header once usage crosses 50% of the day's credit allowance.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const domain = apiDomainFromConnection(ctx.connection);
    const res = await ctx.fetch(`${domain}${API_PREFIX}${CURRENT_USER_PATH}`);
    if (!res.ok) return { state: "unknown", message: `quota probe returned ${res.status}` };

    const header = res.headers.get("x-api-credits-remaining");
    if (header === null) {
      return {
        state: "ok",
        message:
          "below 50% of the daily API credit allowance used (Zoho reports remaining credits only above that threshold)",
        ttlSeconds: 300,
      };
    }

    const remaining = Number(header);
    if (!Number.isFinite(remaining)) {
      return { state: "unknown", message: `unparseable X-API-CREDITS-REMAINING: "${header}"` };
    }
    return {
      state: headroom(remaining),
      quota: [{ id: "daily-credits", remaining, unit: "credits" }],
      ttlSeconds: 300,
    };
  },
};

export default quota;
