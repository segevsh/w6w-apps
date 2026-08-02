import type { ActionDefinition } from "@w6w/types";
import { SurveyMonkeyClient } from "../lib/client.ts";

interface Input {
  surveyId: string;
}

/** GET /surveys/{id} — retrieve a survey's metadata (title, dates, counts, links). */
const surveyGet: ActionDefinition<Input> = {
  key: "survey-get",
  type: "read",
  resource: "survey",
  title: "Get Survey",
  description: "Retrieve a survey's metadata by id.",
  params: [
    { key: "surveyId", label: "Survey ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Survey ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "nickname", type: "string", label: "Nickname" },
    { key: "href", type: "string", label: "Self link" },
  ],

  execute(input, ctx) {
    return new SurveyMonkeyClient(ctx).request(`/surveys/${encodeURIComponent(input.surveyId)}`);
  },
};

export default surveyGet;
