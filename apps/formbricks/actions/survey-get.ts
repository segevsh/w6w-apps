import type { ActionDefinition } from "@w6w/types";
import { FormbricksClient, seg } from "../lib/client.ts";

interface Input {
  surveyId: string;
}

/** `GET /api/v1/management/surveys/{surveyId}` */
const surveyGet: ActionDefinition<Input> = {
  key: "survey-get",
  type: "read",
  resource: "survey",
  title: "Get Survey",
  description: "Fetch one survey by ID, including its questions and blocks.",
  params: [
    {
      "key": "surveyId",
      "label": "Survey ID",
      "type": "string",
      "required": true,
    },
  ],
  output: [
    { key: "data", type: "object", label: "The record returned by Formbricks" },
  ],

  async execute(input, ctx) {
    const res = await new FormbricksClient(ctx).request(
      "GET",
      `/management/surveys/${seg(input.surveyId)}`,
    );
    return { data: res.data ?? null };
  },
};

export default surveyGet;
