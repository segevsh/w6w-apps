import type { ActionDefinition } from "@w6w/types";
import { resultPath, ScoreAppClient } from "../lib/client.ts";
import { resultParam, scorecardParam } from "../lib/params.ts";

/**
 * `GET /scorecards/{scorecard}/results/{result}` — one result, optionally with
 * relationships pulled in.
 *
 * Without `include[]` the response is just the result row (`id`, `key`,
 * `purchased`, `first_name`, `last_name`, `email`, `status`, `created_at`) — the
 * same row shape `result-list` returns, which is what makes the two composable.
 *
 * ## `include[]` is a repeated parameter, not a list
 *
 * The vendor's own examples spell it `?include[]=answers&include[]=scores&…`:
 * the key repeats, once per value. This action sends exactly that and never a
 * comma-joined value, which is a different request.
 *
 * ## The one documented 403
 *
 * `additional_data` — enriched contact fields such as job title and company
 * domain — is documented as Pro-plan-only **and** as requiring an email address
 * on the result; asking for it otherwise is documented as a `403`. That is a
 * plan/permission answer about one include, not an auth failure, and the client
 * says so in the error rather than reporting a bare 403.
 *
 * ## Where the cheapest answer to "what did they answer" lives
 *
 * `include[]=answers` returns the same per-question answers as
 * `result-answers-get`, but wrapped in the whole result and alongside every other
 * relationship asked for. For an answers-only read, the dedicated endpoint is
 * cheaper; this action exists for the case where the result row and its answers
 * are wanted together.
 */
interface Input {
  scorecard: string;
  result: string;
  include?: string[];
}

const resultGet: ActionDefinition<Input, { data?: unknown }> = {
  key: "result-get",
  type: "read",
  resource: "result",
  title: "Get Result",
  description: "Read one result (lead), optionally including its answers, scores and source.",
  params: [
    scorecardParam,
    resultParam,
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      options: [
        { value: "answers", label: "Answers", description: "The per-question answers" },
        {
          value: "scores",
          label: "Scores",
          description: "Calculated total and per-category scores",
        },
        { value: "source", label: "Source", description: "UTM parameters the lead arrived with" },
        { value: "activity", label: "Activity", description: "The result's activity log" },
        {
          value: "additional_data",
          label: "Additional data",
          description: "Enriched contact fields — Pro plan only, and needs an email on the result",
        },
      ],
      hint: "Sent as a repeated `include[]` parameter, the vendor's own documented form. Each " +
        "relationship adds a member to the response's `data`.",
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "The result, plus whichever relationships were asked for",
    },
  ],

  execute(input, ctx) {
    return new ScoreAppClient(ctx).json(resultPath(input.scorecard, input.result), {
      repeat: input.include?.length ? { "include[]": input.include } : undefined,
    });
  },
};

export default resultGet;
