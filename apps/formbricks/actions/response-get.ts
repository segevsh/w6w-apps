import type { ActionDefinition } from "@w6w/types";
import { FormbricksClient, seg } from "../lib/client.ts";

interface Input {
  responseId: string;
}

/** `GET /api/v1/management/responses/{responseId}` */
const responseGet: ActionDefinition<Input> = {
  key: "response-get",
  type: "read",
  resource: "response",
  title: "Get Response",
  description: "Fetch one response, with its answers, metadata and contact.",
  params: [
    {
      "key": "responseId",
      "label": "Response ID",
      "type": "string",
      "required": true,
    },
  ],
  output: [
    { key: "data", type: "object", label: "The record returned by Formbricks" },
  ],

  async execute(input, ctx) {
    const res = await new FormbricksClient(ctx).request(
      "GET",
      `/management/responses/${seg(input.responseId)}`,
    );
    return { data: res.data ?? null };
  },
};

export default responseGet;
