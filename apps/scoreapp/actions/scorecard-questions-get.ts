import type { ActionDefinition } from "@w6w/types";
import { ScoreAppClient, type ScoreAppEnvelope, scorecardPath } from "../lib/client.ts";
import { scorecardParam } from "../lib/params.ts";

/**
 * `GET /scorecards/{scorecard}/questions` — a scorecard's main questions, each
 * with its options and its scoring categories.
 *
 * Not paginated: the vendor returns the full `data` array. "Main questions" is
 * the vendor's own phrase; the rows carry `type` (`quiz`, `signup`, …) and
 * `answer_type` (`yesno`, `text`, `single_choice`, …), both free-form strings in
 * the documented examples rather than enums, so nothing here narrows them.
 *
 * The `categories` on a question are the score buckets that question feeds, and
 * they are the join key to `scorecard-categories-get` — a category appears in
 * both places with the same `id`, which is how a workflow lines a score up with
 * the question that produced it.
 */
interface Input {
  scorecard: string;
}

const scorecardQuestionsGet: ActionDefinition<Input, ScoreAppEnvelope<unknown>> = {
  key: "scorecard-questions-get",
  type: "read",
  resource: "scorecard",
  title: "Get Scorecard Questions",
  description: "Read a scorecard's questions with their answer options and scoring categories.",
  params: [scorecardParam],
  output: [
    { key: "data", type: "array", label: "Questions, each with its options and categories" },
  ],

  execute(input, ctx) {
    return new ScoreAppClient(ctx).json(`${scorecardPath(input.scorecard)}/questions`);
  },
};

export default scorecardQuestionsGet;
