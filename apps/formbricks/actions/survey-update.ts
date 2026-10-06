import type { ActionDefinition } from "@w6w/types";
import { compact, FormbricksClient, jsonValue, objectValue, seg } from "../lib/client.ts";

interface Input {
  surveyId: string;
  name?: string;
  status?: "draft" | "inProgress" | "paused" | "completed";
  displayOption?: "displayOnce" | "displayMultiple" | "respondMultiple" | "displaySome";
  questions?: unknown;
  endings?: unknown;
  fields?: unknown;
}

/** `PUT /api/v1/management/surveys/{surveyId}` */
const surveyUpdate: ActionDefinition<Input> = {
  key: "survey-update",
  type: "perform",
  resource: "survey",
  title: "Update Survey",
  description: "Update an existing survey with a partial body. Only the fields you set are sent.",
  idempotent: true,
  params: [
    {
      "key": "surveyId",
      "label": "Survey ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "name",
      "label": "Name",
      "type": "string",
    },
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "options": [
        {
          "value": "draft",
          "label": "draft",
        },
        {
          "value": "inProgress",
          "label": "inProgress",
        },
        {
          "value": "paused",
          "label": "paused",
        },
        {
          "value": "completed",
          "label": "completed",
        },
      ],
    },
    {
      "key": "displayOption",
      "label": "Display option",
      "type": "select",
      "options": [
        {
          "value": "displayOnce",
          "label": "displayOnce",
        },
        {
          "value": "displayMultiple",
          "label": "displayMultiple",
        },
        {
          "value": "respondMultiple",
          "label": "respondMultiple",
        },
        {
          "value": "displaySome",
          "label": "displaySome",
        },
      ],
    },
    {
      "key": "questions",
      "label": "Questions",
      "type": "json",
      "hint": "Replaces the survey's questions.",
    },
    {
      "key": "endings",
      "label": "Endings",
      "type": "json",
    },
    {
      "key": "fields",
      "label": "Additional fields",
      "type": "json",
      "hint":
        "Object merged into the request body for any other survey field. The named fields above win on conflict.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The record returned by Formbricks" },
  ],

  async execute(input, ctx) {
    const res = await new FormbricksClient(ctx).request(
      "PUT",
      `/management/surveys/${seg(input.surveyId)}`,
      {
        body: compact({
          ...objectValue(input.fields),
          name: input.name,
          status: input.status,
          displayOption: input.displayOption,
          questions: jsonValue(input.questions),
          endings: jsonValue(input.endings),
        }),
      },
    );
    return { data: res.data ?? null };
  },
};

export default surveyUpdate;
