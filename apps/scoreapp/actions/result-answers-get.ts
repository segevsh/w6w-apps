import type { ActionDefinition } from "@w6w/types";
import { resultPath, ScoreAppClient, type ScoreAppEnvelope } from "../lib/client.ts";
import { resultParam, scorecardParam } from "../lib/params.ts";

/**
 * `GET /scorecards/{scorecard}/results/{result}/answers` — one result's
 * per-question answers.
 *
 * This is the same data as `result-get` with `include[]=answers`, and it has its
 * own endpoint for a reason worth naming: it is the cheap one. The single-result
 * read with every include returns the result, its scores, UTM source, activity
 * log and (on Pro) enriched contact data alongside the answers — this read
 * returns the answers and nothing else.
 *
 * Each row is a question with its `categories`, `options` and an `answers` array.
 * The answer payload varies with `answer_type`: a text answer is
 * `{"answer": "…", "option": null, "score": null, "time_spent": 8500}`, while a
 * choice answer adds the chosen `option` object and a `"3.00"`-style string
 * score. Values are strings where the scores include, so nothing here parses them
 * into numbers.
 *
 * The documented `403` on this endpoint belongs to the Pro-plan-only
 * `additional_data` include on the single-result read; it is listed here too, and
 * `lib/client.ts` explains it rather than reporting a bare status.
 */
interface Input {
  scorecard: string;
  result: string;
}

const resultAnswersGet: ActionDefinition<Input, ScoreAppEnvelope<unknown>> = {
  key: "result-answers-get",
  type: "read",
  resource: "result",
  title: "Get Result Answers",
  description:
    "Read one result's per-question answers, with the questions and options they answer.",
  params: [scorecardParam, resultParam],
  output: [{ key: "data", type: "array", label: "Questions with the answers given" }],

  execute(input, ctx) {
    return new ScoreAppClient(ctx).json(`${resultPath(input.scorecard, input.result)}/answers`);
  },
};

export default resultAnswersGet;
