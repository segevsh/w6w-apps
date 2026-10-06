import type { ActionDefinition } from "@w6w/types";
import { FormbricksClient, seg } from "../lib/client.ts";

interface Input {
  surveyId: string;
}

/** `DELETE /api/v1/management/surveys/{surveyId}` */
const surveyDelete: ActionDefinition<Input> = {
  key: "survey-delete",
  type: "perform",
  resource: "survey",
  title: "Delete Survey",
  description:
    "Permanently delete a survey and its responses. Formbricks asks that this is used only when strictly necessary.",
  idempotent: true,
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
      "DELETE",
      `/management/surveys/${seg(input.surveyId)}`,
    );
    return { data: res.data ?? null };
  },
};

export default surveyDelete;
