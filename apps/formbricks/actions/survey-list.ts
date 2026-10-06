import type { ActionDefinition } from "@w6w/types";
import { FormbricksClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /api/v1/management/surveys` */
const surveyList: ActionDefinition<Input> = {
  key: "survey-list",
  type: "search",
  resource: "survey",
  title: "List Surveys",
  description:
    "List every survey the API key can reach. Each survey carries both `questions` (legacy) and `blocks` (current); `questions` is derived from `blocks`.",
  params: [],
  output: [
    { key: "data", type: "array", label: "The records returned by Formbricks" },
  ],

  async execute(_input, ctx) {
    const res = await new FormbricksClient(ctx).request("GET", "/management/surveys");
    return { data: res.data ?? [] };
  },
};

export default surveyList;
