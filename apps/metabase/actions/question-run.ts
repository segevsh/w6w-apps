import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, MetabaseClient } from "../lib/client.ts";
import { ignoreCacheParam, queryParametersParam, queryResultOutput } from "../lib/params.ts";

/**
 * `POST /api/card/{card-id}/query` — run a saved question and return its rows.
 *
 * This is the action the app exists for: someone has already built the question
 * in Metabase, with the joins and the filters and the business logic in it, and
 * a workflow wants today's answer.
 *
 * ## Three things about the response
 *
 * **It comes back as HTTP 202, not 200.** Query results stream, and Metabase's
 * streaming response defaults to `202`. Verified on the wire; see
 * `lib/client.ts` for the source citation. Nothing here compares against 200.
 *
 * **A failed query can still be a 2xx.** The result carries its own `status`,
 * and `client.runQuery` throws when it is `failed`. Without that, a workflow
 * would happily branch on an empty `data.rows` produced by a SQL error.
 *
 * **`data.rows` is positional.** Metabase returns
 * `{"rows": [[1,"a"],[2,"b"]], "cols": [{"name":"id",…},{"name":"letter",…}]}` —
 * arrays, not objects, with the names alongside in `cols` in the same order.
 * Verified live: a question selecting `1 AS one, 2 AS two` returns
 * `rows: [[1,2]]`. A caller wanting `{column: value}` objects should use
 * `question-export` with `format: "json"`, which is the one path where Metabase
 * itself does the zipping.
 *
 * ## The row ceiling
 *
 * This endpoint applies Metabase's default query constraints:
 * **2,000 rows** for an unaggregated question, **10,000** for an aggregated one
 * (`query_processor/middleware/constraints.clj`). The result is *silently
 * truncated* — `row_count` reports what came back, not what matched, and there
 * is no flag saying "there was more". Verified live: a sample question over a
 * larger table returned exactly `row_count: 2000`.
 *
 * There is no offset parameter to page past it. The two ways out are both
 * deliberate:
 *
 *   - **`question-export`** — the export formats drop the constraints entirely
 *     (`qpapi.clj` applies `default-query-constraints` only when the format is
 *     `:api`), so CSV/JSON/XLSX return the full result set. Measured on the same
 *     question, same instance, same day: `/query` returned **2,000** rows and
 *     `/query/csv` returned **18,760**.
 *   - **`query-run`** with an explicit `LIMIT`/`OFFSET` in native SQL, when the
 *     goal really is to walk a large table.
 */
interface Input {
  cardId: number;
  parameters?: unknown;
  ignoreCache?: boolean;
}

const questionRun: ActionDefinition<Input> = {
  key: "question-run",
  type: "read",
  resource: "question",
  title: "Run Question",
  description:
    "Run a saved Metabase question and return its rows. Truncated at 2,000 rows (10,000 if " +
    "aggregated) — use Export Question for the full result set.",
  params: [
    {
      key: "cardId",
      label: "Question ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "The number in the question's URL: /question/42-monthly-revenue → 42.",
    },
    queryParametersParam,
    ignoreCacheParam,
  ],
  output: queryResultOutput,

  execute(input, ctx) {
    return new MetabaseClient(ctx).runQuery(
      `/api/card/${encodeURIComponent(String(input.cardId))}/query`,
      {
        body: {
          parameters: asOptionalJson<unknown[]>(input.parameters, "Parameters"),
          ignore_cache: input.ignoreCache ?? false,
        },
      },
    );
  },
};

export default questionRun;
