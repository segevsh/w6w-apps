import type { ActionDefinition } from "@w6w/types";
import { SurveyMonkeyClient } from "../lib/client.ts";

interface Input {
  surveyId: string;
  responseId: string;
  simple?: boolean;
  pageIds?: string;
  questionIds?: string;
}

/**
 * GET /surveys/{id}/responses/{response_id}/details — one response, fully
 * expanded with every page/question answer.
 */
const responseGetDetails: ActionDefinition<Input> = {
  key: "response-get-details",
  type: "read",
  resource: "response",
  title: "Get Response Details",
  description: "Retrieve a single response, fully expanded with all question answers.",
  params: [
    { key: "surveyId", label: "Survey ID", type: "string", required: true },
    { key: "responseId", label: "Response ID", type: "string", required: true },
    {
      key: "simple",
      label: "Include question/answer text",
      type: "boolean",
      hint: "When true, includes readable question and answer text in addition to ids.",
    },
    {
      key: "pageIds",
      label: "Page IDs",
      type: "string",
      hint: "Comma-separated survey page ids to restrict to.",
    },
    {
      key: "questionIds",
      label: "Question IDs",
      type: "string",
      hint: "Comma-separated survey question ids to restrict to.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Response ID" },
    { key: "pages", type: "array", label: "Answered pages" },
    { key: "response_status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new SurveyMonkeyClient(ctx).request(
      `/surveys/${encodeURIComponent(input.surveyId)}/responses/${
        encodeURIComponent(input.responseId)
      }/details`,
      {
        query: {
          simple: input.simple,
          page_ids: input.pageIds,
          question_ids: input.questionIds,
        },
      },
    );
  },
};

export default responseGetDetails;
