import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  surveyId: number;
  userId: number;
}

const surveyGetAnswers: ActionDefinition<Input> = {
  key: "survey-get-answers",
  type: "read",
  resource: "unit",
  title: "Get Survey Answers",
  description: "A user's answers in a survey.",
  params: [
    { key: "surveyId", label: "Survey ID", type: "number", required: true },
    { key: "userId", label: "User ID", type: "number", required: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("getsurveyanswers", {
      survey_id: input.surveyId,
      user_id: input.userId,
    });
  },
};

export default surveyGetAnswers;
