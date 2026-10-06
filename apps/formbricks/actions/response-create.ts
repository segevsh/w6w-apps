import type { ActionDefinition } from "@w6w/types";
import { compact, FormbricksClient, jsonValue } from "../lib/client.ts";

interface Input {
  surveyId: string;
  data?: unknown;
  finished?: boolean;
  language?: string;
}

/** `POST /api/v1/management/responses` */
const responseCreate: ActionDefinition<Input> = {
  key: "response-create",
  type: "perform",
  resource: "response",
  title: "Create Response",
  description:
    "Create a response for a survey. This runs the response pipeline: webhooks, integrations and follow-up emails fire as for a real respondent.",
  idempotent: false,
  params: [
    {
      "key": "surveyId",
      "label": "Survey ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "data",
      "label": "Answers",
      "type": "json",
      "hint":
        'Object keyed by question ID, e.g. {"hg508afs7lgx8nlni5dtit5u":["Hello World"]}. The value shape depends on the question type.',
    },
    {
      "key": "finished",
      "label": "Finished",
      "type": "boolean",
      "hint": "Mark the response as finished.",
    },
    {
      "key": "language",
      "label": "Language",
      "type": "string",
      "hint": "Language code; the survey must have it enabled.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The record returned by Formbricks" },
  ],

  async execute(input, ctx) {
    const res = await new FormbricksClient(ctx).request("POST", "/management/responses", {
      body: compact({
        surveyId: input.surveyId,
        data: jsonValue(input.data),
        finished: input.finished,
        language: input.language,
      }),
    });
    return { data: res.data ?? null };
  },
};

export default responseCreate;
