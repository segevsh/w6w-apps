/**
 * ScoreApp — the quiz-funnel / lead-scoring platform: list an account's
 * scorecards (quizzes), read their questions and scoring categories, and read
 * the results (leads) they collect, with each result's per-question answers,
 * over ScoreApp's own "Open API" (`open-api.scoreapp.com`).
 *
 * Every path, parameter, response shape and status code in this app was verified
 * on 2026-09-22 against ScoreApp's own reference article, "ScoreApp Public API -
 * Getting Started"
 * (`support.scoreapp.com/article/217-scoreapp-public-api-getting-started` — the
 * complete reference: the whole documented surface is that one page), plus live
 * probes against `open-api.scoreapp.com` and the status hosts. Nothing here came
 * from a third-party integration directory, and no endpoint was inferred from a
 * sibling app.
 *
 * The five findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The API host is `open-api.scoreapp.com`, not the guess**
 *     (`lib/client.ts`). `api.scoreapp.com` and `developer.scoreapp.com` both
 *     `302` to the marketing site. The real origin answers all six documented
 *     paths with `401 {"error":"Unauthenticated."}` — never a `404`, never an
 *     HTML shell.
 *  2. **`Accept: application/json` is load-bearing** (`lib/client.ts`,
 *     `auth/api-key.ts`). ScoreApp is Laravel: a request that does not ask for
 *     JSON is answered with a `302` to the login page instead of the documented
 *     JSON error, which misclassifies every auth failure as a redirect problem.
 *     The header is sent on every request and a non-JSON body is refused rather
 *     than parsed.
 *  3. **Rate-limit headroom is actually readable** (`health/rate-limit.ts`).
 *     `x-ratelimit-limit`/`x-ratelimit-remaining` are on every response,
 *     including the `401`s, and the remaining count decrements per request —
 *     measured live `119 → 114`. Unusually for this pack, that makes `quota` a
 *     real probe rather than a declared absence. The docs say 100/minute, the
 *     wire says 120; neither number is hardcoded, the headers are read.
 *  4. **The vendor's own documentation disagrees about identifiers**
 *     (`lib/params.ts`). `List Scorecards` shows UUID ids while the
 *     questions/categories/results endpoints document the same path parameter as
 *     `(integer, required)` and use small integers in their examples. Every path
 *     id here is declared a `string` and passed through uncoerced, which is the
 *     safe reading of both.
 *  5. **There is no status page** (`health/service.ts`). `status.scoreapp.com`
 *     `302`s to the marketing site and `scoreapp.statuspage.io` is the unclaimed
 *     Statuspage decoy; the `service` check declares that absence as a positive
 *     fact at `informational` severity.
 *
 * Two consequences of the vendor's shape are worth knowing before reading the
 * actions: the API is **read-only** — ScoreApp documents no create, update or
 * delete of scorecards or results, so every action here is a list or a get — and
 * every action returns the vendor's own response envelope **verbatim**
 * (`{data}`, or `{data, links, meta}` on the two paginated reads), because
 * `meta.total` and `links.next` are how a workflow walks a collection.
 *
 * Webhooks are deliberately absent: ScoreApp's webhook feature is configured in
 * their UI and pushes out, which is not this REST surface (see `README.md`).
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import scorecardList from "./actions/scorecard-list.ts";
import scorecardQuestionsGet from "./actions/scorecard-questions-get.ts";
import scorecardCategoriesGet from "./actions/scorecard-categories-get.ts";
import resultList from "./actions/result-list.ts";
import resultGet from "./actions/result-get.ts";
import resultAnswersGet from "./actions/result-answers-get.ts";

import service from "./health/service.ts";
import rateLimit from "./health/rate-limit.ts";

export default {
  actions: [
    // Scorecards
    scorecardList,
    scorecardQuestionsGet,
    scorecardCategoriesGet,
    // Results (leads)
    resultList,
    resultGet,
    resultAnswersGet,
  ],
  // API key only, presented as `Authorization: Bearer <key>`. ScoreApp
  // documents no OAuth surface and no second auth mode.
  auth: [apiKey],
  healthChecks: [service, rateLimit],
} satisfies AppDefinition;
