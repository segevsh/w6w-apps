import type { ActionDefinition } from "@w6w/types";
import { FormbricksClient, seg } from "../lib/client.ts";

interface Input {
  responseId: string;
}

/** `DELETE /api/v1/management/responses/{responseId}` */
const responseDelete: ActionDefinition<Input> = {
  key: "response-delete",
  type: "perform",
  resource: "response",
  title: "Delete Response",
  description: "Permanently delete a response.",
  idempotent: true,
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
      "DELETE",
      `/management/responses/${seg(input.responseId)}`,
    );
    return { data: res.data ?? null };
  },
};

export default responseDelete;
