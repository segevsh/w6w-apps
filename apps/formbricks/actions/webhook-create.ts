import type { ActionDefinition } from "@w6w/types";
import { compact, FormbricksClient, strList } from "../lib/client.ts";

interface Input {
  url: string;
  triggers: string[] | string;
  name?: string;
  surveyIds?: string[] | string;
}

/** `POST /api/v1/webhooks` */
const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description:
    "Create a webhook that Formbricks calls when a response is created, updated or finished.",
  idempotent: false,
  params: [
    {
      "key": "url",
      "label": "URL",
      "type": "string",
      "required": true,
      "hint": "The endpoint Formbricks will call.",
    },
    {
      "key": "triggers",
      "label": "Triggers",
      "type": "array",
      "required": true,
      "hint": "Any of responseCreated, responseUpdated, responseFinished.",
      "item": {
        "type": "string",
      },
    },
    {
      "key": "name",
      "label": "Name",
      "type": "string",
    },
    {
      "key": "surveyIds",
      "label": "Survey IDs",
      "type": "array",
      "hint": "Only fire for these surveys. Empty means all surveys.",
      "item": {
        "type": "string",
      },
    },
  ],
  output: [
    { key: "data", type: "object", label: "The record returned by Formbricks" },
  ],

  async execute(input, ctx) {
    const res = await new FormbricksClient(ctx).request("POST", "/webhooks", {
      body: compact({
        url: input.url,
        triggers: strList(input.triggers),
        name: input.name,
        surveyIds: strList(input.surveyIds),
      }),
    });
    return { data: res.data ?? null };
  },
};

export default webhookCreate;
