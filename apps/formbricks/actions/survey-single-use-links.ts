import type { ActionDefinition } from "@w6w/types";
import { FormbricksClient, seg } from "../lib/client.ts";

interface Input {
  surveyId: string;
  limit?: number;
}

/** `GET /api/v1/management/surveys/{surveyId}/singleUseIds` */
const surveySingleUseLinks: ActionDefinition<Input> = {
  key: "survey-single-use-links",
  type: "read",
  resource: "survey",
  title: "Generate Single-Use Links",
  description:
    "Generate single-use survey links for a survey. The survey must have single-use links enabled (otherwise 400).",
  params: [
    {
      "key": "surveyId",
      "label": "Survey ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "limit",
      "label": "Number of links",
      "type": "number",
      "hint": "How many links to generate.",
      "validation": {
        "min": 1,
        "integer": true,
      },
    },
  ],
  output: [
    { key: "data", type: "array", label: "The generated survey URLs" },
  ],

  async execute(input, ctx) {
    const res = await new FormbricksClient(ctx).request(
      "GET",
      `/management/surveys/${seg(input.surveyId)}/singleUseIds`,
      { query: { limit: input.limit } },
    );
    return { data: res.data ?? [] };
  },
};

export default surveySingleUseLinks;
