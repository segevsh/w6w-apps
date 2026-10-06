import type { ActionDefinition } from "@w6w/types";
import { AvomaClient } from "../lib/client.ts";
import { pageOutput } from "../lib/params.ts";

/** `GET /v1/scorecards/` — scorecard templates. Documented with no parameters. */
type Input = Record<string, never>;

const scorecardList: ActionDefinition<Input> = {
  key: "scorecard-list",
  type: "search",
  resource: "scorecard",
  title: "List Scorecards",
  description: "List scorecard templates with their questions and answer choices.",
  params: [],
  output: pageOutput,

  execute(_input, ctx) {
    return new AvomaClient(ctx).list("/v1/scorecards/", {});
  },
};

export default scorecardList;
