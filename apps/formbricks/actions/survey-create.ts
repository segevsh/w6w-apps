import type { ActionDefinition } from "@w6w/types";
import { compact, FormbricksClient, jsonValue, objectValue } from "../lib/client.ts";

interface Input {
  workspaceId: string;
  name: string;
  type: "link" | "app";
  status: "draft" | "inProgress" | "paused" | "completed";
  displayOption?: "displayOnce" | "displayMultiple" | "respondMultiple" | "displaySome";
  questions?: unknown;
  endings?: unknown;
  languages?: unknown;
  fields?: unknown;
}

/** `POST /api/v1/management/surveys` */
const surveyCreate: ActionDefinition<Input> = {
  key: "survey-create",
  type: "perform",
  resource: "survey",
  title: "Create Survey",
  description:
    "Create a survey. Formbricks recommends building surveys in its editor; this accepts the documented core fields plus any other survey field via `fields`.",
  idempotent: false,
  params: [
    {
      "key": "workspaceId",
      "label": "Workspace ID",
      "type": "string",
      "required": true,
      "hint":
        "The workspace (formerly environment) the survey is created in. The API still accepts `environmentId` as a deprecated alias.",
    },
    {
      "key": "name",
      "label": "Name",
      "type": "string",
      "required": true,
    },
    {
      "key": "type",
      "label": "Type",
      "type": "select",
      "required": true,
      "options": [
        {
          "value": "link",
          "label": "link",
        },
        {
          "value": "app",
          "label": "app",
        },
      ],
    },
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "required": true,
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
      "hint": "For app surveys: how often a user may be shown it.",
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
      "hint":
        'Array of question objects, e.g. [{"id":"q1","type":"openText","headline":{"default":"What would you like to know?"},"required":true,"inputType":"text"}]. The server derives `blocks` from them.',
    },
    {
      "key": "endings",
      "label": "Endings",
      "type": "json",
      "hint":
        'Array of ending cards, e.g. [{"id":"e1","type":"endScreen","headline":{"default":"Thank you!"}}].',
    },
    {
      "key": "languages",
      "label": "Languages",
      "type": "json",
      "hint":
        "Array of { language, default, enabled }. Each language must already exist in the workspace.",
    },
    {
      "key": "fields",
      "label": "Additional fields",
      "type": "json",
      "hint":
        "Object merged into the request body for any other survey field (welcomeCard, hiddenFields, delay, recontactDays, redirectUrl, styling, triggers, ...). The named fields above win on conflict.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The record returned by Formbricks" },
  ],

  async execute(input, ctx) {
    const res = await new FormbricksClient(ctx).request("POST", "/management/surveys", {
      body: compact({
        ...objectValue(input.fields),
        workspaceId: input.workspaceId,
        name: input.name,
        type: input.type,
        status: input.status,
        displayOption: input.displayOption,
        questions: jsonValue(input.questions),
        endings: jsonValue(input.endings),
        languages: jsonValue(input.languages),
      }),
    });
    return { data: res.data ?? null };
  },
};

export default surveyCreate;
