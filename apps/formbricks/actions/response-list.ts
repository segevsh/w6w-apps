import type { ActionDefinition } from "@w6w/types";
import { FormbricksClient } from "../lib/client.ts";

interface Input {
  surveyId?: string;
  limit?: number;
  skip?: number;
}

/** `GET /api/v1/management/responses` */
const responseList: ActionDefinition<Input> = {
  key: "response-list",
  type: "search",
  resource: "response",
  title: "List Responses",
  description:
    "List survey responses. Pass a survey ID to restrict to one survey; page with `limit` and `skip`.",
  params: [
    {
      "key": "surveyId",
      "label": "Survey ID",
      "type": "string",
      "hint": "Only responses to this survey.",
    },
    {
      "key": "limit",
      "label": "Limit",
      "type": "number",
      "hint": "Number of items to return.",
      "validation": {
        "min": 1,
        "integer": true,
      },
    },
    {
      "key": "skip",
      "label": "Skip",
      "type": "number",
      "hint": "Number of items to skip.",
      "validation": {
        "min": 0,
        "integer": true,
      },
    },
  ],
  output: [
    { key: "data", type: "array", label: "The records returned by Formbricks" },
  ],

  async execute(input, ctx) {
    const res = await new FormbricksClient(ctx).request("GET", "/management/responses", {
      query: { surveyId: input.surveyId, limit: input.limit, skip: input.skip },
    });
    return { data: res.data ?? [] };
  },
};

export default responseList;
