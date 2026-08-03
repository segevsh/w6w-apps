import type { ActionDefinition } from "@w6w/types";
import { MetabaseClient } from "../lib/client.ts";
import { cardOutput } from "../lib/params.ts";

/**
 * `GET /api/card/{id}` — fetch one saved question's definition.
 *
 * This is the introspection action the two query actions lean on, and it is
 * worth saying why it earns a place beside them rather than being a footnote:
 *
 *   - **`parameters`** tells a caller what `question-run` may be given. A
 *     question's filter targets are authored inside Metabase and are not
 *     guessable from outside; this array is the only description of them.
 *   - **`dataset_query`** is a *valid body* for `query-run`. Reading it off a
 *     question built in the UI is by far the easiest way to obtain
 *     well-formed MBQL, which is otherwise hand-written s-expressions.
 *   - **`result_metadata`** names and types the columns, which is what makes the
 *     positional `data.rows` from `question-run` interpretable without running
 *     the question first.
 *
 * The id is the number in the question's URL: `/question/42-monthly-revenue`
 * → 42. Metabase also accepts a 21-character NanoID here (the OpenAPI schema
 * types the path parameter as `integer | nanoid`), which is the entity id used
 * by serialisation/export. The param is typed `string` so both forms pass
 * through unchanged rather than a NanoID being mangled by a numeric coercion.
 */
interface Input {
  cardId: number | string;
}

const questionGet: ActionDefinition<Input> = {
  key: "question-get",
  type: "read",
  resource: "question",
  title: "Get Question",
  description:
    "Fetch one saved question's full definition — its query, its parameters and its column " +
    "metadata.",
  params: [
    {
      key: "cardId",
      label: "Question ID",
      type: "string",
      required: true,
      hint: "The number in the question's URL (/question/42-monthly-revenue → 42), or its " +
        "21-character entity id.",
    },
  ],
  output: cardOutput,

  execute(input, ctx) {
    return new MetabaseClient(ctx).request(
      `/api/card/${encodeURIComponent(String(input.cardId))}`,
    );
  },
};

export default questionGet;
