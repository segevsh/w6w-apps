import type { ActionDefinition } from "@w6w/types";
import { compact, FormbricksClient, jsonValue, seg } from "../lib/client.ts";

interface Input {
  responseId: string;
  data?: unknown;
  finished?: boolean;
}

/** `PUT /api/v1/management/responses/{responseId}` */
const responseUpdate: ActionDefinition<Input> = {
  key: "response-update",
  type: "perform",
  resource: "response",
  title: "Update Response",
  description:
    "Update a response, e.g. to add answers or mark it finished. Runs the response pipeline (webhooks fire; follow-up emails when finished).",
  idempotent: true,
  params: [
    {
      "key": "responseId",
      "label": "Response ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "data",
      "label": "Answers",
      "type": "json",
      "hint": "Answers keyed by question ID.",
    },
    {
      "key": "finished",
      "label": "Finished",
      "type": "boolean",
      "hint": "Mark the response as finished.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The record returned by Formbricks" },
  ],

  async execute(input, ctx) {
    const res = await new FormbricksClient(ctx).request(
      "PUT",
      `/management/responses/${seg(input.responseId)}`,
      { body: compact({ data: jsonValue(input.data), finished: input.finished }) },
    );
    return { data: res.data ?? null };
  },
};

export default responseUpdate;
