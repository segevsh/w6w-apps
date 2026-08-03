/**
 * How much headroom is left on this credential — declared absent, honestly.
 *
 * A `quota` check reads one of two signals: rate-limit response headers, or an
 * endpoint that states an allowance. Manychat publishes **neither**. What it
 * publishes instead is a set of *fixed constants written into prose*, which is
 * not the same thing and cannot be turned into one.
 *
 * ## The limits are real, documented, and useless to a probe
 *
 * Every operation in the OpenAPI document
 * (`api.manychat.com/swagger/compileJson?type=Page_API`, fetched 2026-08-03)
 * carries its limit in the `description` field, as English:
 *
 *     /fb/page/getInfo            "***Limit:*** 100 queries per second"
 *     /fb/page/getTags            "***Limit:*** 100 queries per second"
 *     /fb/subscriber/getInfo      "***Limit:*** 10 queries per second"
 *     /fb/subscriber/findBySystemField  "***Limit:*** 50 queries per second"
 *     /fb/sending/sendContent     "***Limit:*** 25 queries per second"
 *     /fb/sending/sendFlow        "***Limit:*** 20 queries per second,
 *                                  100 queries per a given subscriber per hour"
 *     (every write method)        "***Limit:*** 10 queries per second"
 *
 * These are per-method ceilings, not a consumable balance. They are the same
 * numbers for every account on every day; nothing in the API reports how much of
 * a second's allowance has been spent, and a per-second window is gone before a
 * health check could report it anyway. Restating a constant would not be a health
 * check — it would be documentation wearing a probe's clothes, and a green
 * verdict that is green by construction is worse than no verdict.
 *
 * `sendFlow`'s second limit — 100 sends per subscriber per hour — is the one that
 * *is* a consumable balance, but it is per **subscriber**, and neither a
 * subscriber id nor any endpoint reporting that counter is available to a
 * `scope: "app"`/`scope: "connection"` probe. It is documented in README.md so a
 * workflow author knows the ceiling exists.
 *
 * ## No rate-limit headers
 *
 * Checked on the wire on 2026-08-03. The complete response header set from
 * `api.manychat.com` was:
 *
 *     $ curl -sSD - -o /dev/null -H 'Authorization: Bearer 123456:deadbeef' \
 *         https://api.manychat.com/fb/page/getInfo
 *     HTTP/2 401
 *     date: Mon, 03 Aug 2026 20:44:33 GMT
 *     content-type: application/json; charset=UTF-8
 *     strict-transport-security: max-age=31536000; includeSubDomains; preload
 *
 * Three headers, none of them a counter. No `X-RateLimit-*`, no `RateLimit-*`,
 * no `Retry-After`.
 *
 * **Stated plainly, because it is the one gap in this evidence:** that is a 401,
 * observed without a Manychat account. It is possible — not documented anywhere,
 * but possible — that an authenticated 200 carries headers a rejected request
 * does not. Nothing in Manychat's OpenAPI document, its official PHP client
 * (`github.com/manychat/manychat-api-php`, which reads only the JSON body and
 * inspects no headers at all), or its published error vocabulary mentions such a
 * header. So the conclusion is well-supported but not exhaustively proven, and
 * this comment says so rather than overclaiming.
 *
 * ## No allowance endpoint
 *
 * The Page API's 36 operations cover the Page, its tags, custom fields, bot
 * fields, growth tools, flows and OTN topics, its subscribers, and sending.
 * **None reports plan limits, message credits, contact allowance or remaining
 * quota.** The one account-level read, `/fb/page/getInfo`, returns
 * `{ id, name, category, avatar_link, username, about, description, is_pro,
 * timezone }` — `is_pro` is a plan *flag*, not a balance. The separate Profile
 * API has exactly one operation (`/user/template/generateSingleUseLink`) and is
 * about template sharing.
 *
 * ## Why this is `unavailable` and not a guess
 *
 * Per rfcs/healthcheck.md an App must be able to declare that no check exists and
 * have that be "a first-class answer rather than an omission".
 *
 * `severity: "informational"` is mandatory here and is not cosmetic: an
 * `unavailable` entry always reports `unknown`, and at the default `degraded`
 * severity that `unknown` would propagate into every roll-up and pin this App at
 * `unknown` permanently, however healthy everything else is.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API rate-limit headroom",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "Manychat publishes fixed per-method QPS ceilings in its OpenAPI descriptions (100/s for " +
      "getInfo and getTags, 50/s for findBySystemField, 25/s for sendContent, 20/s for sendFlow, " +
      "10/s for everything else) but exposes no consumable balance: no rate-limit response " +
      "headers were present on any api.manychat.com response observable without an account " +
      "(checked on the wire 2026-08-03 — only date, content-type and strict-transport-security), " +
      "and none of the API's 36 operations reports plan limits, credits or remaining quota. " +
      "getInfo's `is_pro` is a plan flag, not a balance. Humans can see plan and usage at " +
      "https://app.manychat.com.",
  },
};

export default quota;
