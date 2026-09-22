import type { ActionDefinition } from "@w6w/types";
import { ScoreAppClient, type ScoreAppEnvelope, scorecardPath } from "../lib/client.ts";
import { scorecardParam } from "../lib/params.ts";

/**
 * `GET /scorecards/{scorecard}/categories` — a scorecard's scoring categories.
 *
 * Not paginated, and the vendor's notes are explicit that **both** kinds come
 * back: `type` is `visible` or `hidden`, and `scoring_logic` is `add` (adds to
 * the total score) or `none` (no effect on the total). A caller that filters to
 * `visible` is filtering for display; a caller adding up a score wants `add`.
 *
 * An empty `data` array is a valid answer, not an error — a scorecard with no
 * scoring categories is a plain survey.
 */
interface Input {
  scorecard: string;
}

const scorecardCategoriesGet: ActionDefinition<Input, ScoreAppEnvelope<unknown>> = {
  key: "scorecard-categories-get",
  type: "read",
  resource: "scorecard",
  title: "Get Scorecard Categories",
  description: "Read a scorecard's scoring categories, visible and hidden alike.",
  params: [scorecardParam],
  output: [{ key: "data", type: "array", label: "Scoring categories" }],

  execute(input, ctx) {
    return new ScoreAppClient(ctx).json(`${scorecardPath(input.scorecard)}/categories`);
  },
};

export default scorecardCategoriesGet;
