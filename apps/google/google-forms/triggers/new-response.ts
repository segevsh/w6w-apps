import type { TriggerDefinition } from "@w6w/types";
import { checkNewResponses } from "../lib/triggers.ts";

const newResponse: TriggerDefinition<{ formId: string }> = {
  key: "new-response",
  title: "New Form Response",
  description:
    "The run gets each response newly submitted to a Google Form: its response ID, submission time, respondent email (when collected), score (quizzes) and answers keyed by question ID.",
  params: [{
    key: "formId",
    label: "Form ID or URL",
    type: "string",
    required: true,
    hint:
      "The form to watch. The first check emits nothing; responses submitted before it are never emitted.",
  }],
  output: [
    { key: "formId", type: "string", label: "Form ID" },
    { key: "responseId", type: "string", label: "Response ID" },
    { key: "createTime", type: "string", label: "First submitted" },
    { key: "lastSubmittedTime", type: "string", label: "Last submitted" },
    { key: "respondentEmail", type: "string", label: "Respondent email" },
    { key: "totalScore", type: "number", label: "Total score (quizzes)" },
    { key: "answers", type: "object", label: "Answers by question ID" },
  ],
  sample: {
    formId: "1AbCd",
    responseId: "ACYDBNg_3k",
    createTime: "2026-11-10T09:15:00.123Z",
    lastSubmittedTime: "2026-11-10T09:15:00.123456Z",
    respondentEmail: "ada@example.com",
    answers: {
      "5a1b2c3d": {
        questionId: "5a1b2c3d",
        textAnswers: { answers: [{ value: "Yes" }] },
      },
    },
  },
  minIntervalMs: 300_000,
  poll({ params, state }, ctx) {
    return checkNewResponses(params, state, ctx);
  },
};

export default newResponse;
