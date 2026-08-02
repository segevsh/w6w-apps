import type { ActionDefinition } from "@w6w/types";
import { SurveyMonkeyClient } from "../lib/client.ts";

interface Input {
  surveyId: string;
}

/**
 * GET /surveys/{id}/details — the survey expanded with its full page and
 * question hierarchy, the payload used to render or clone a survey's design.
 */
const surveyGetDetails: ActionDefinition<Input> = {
  key: "survey-get-details",
  type: "read",
  resource: "survey",
  title: "Get Survey Details",
  description: "Retrieve a survey with its full pages and questions expanded.",
  params: [
    { key: "surveyId", label: "Survey ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Survey ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "pages", type: "array", label: "Pages" },
  ],

  execute(input, ctx) {
    return new SurveyMonkeyClient(ctx).request(
      `/surveys/${encodeURIComponent(input.surveyId)}/details`,
    );
  },
};

export default surveyGetDetails;
