import type { ActionDefinition } from "@w6w/types";
import { FormbricksClient, seg } from "../lib/client.ts";

interface Input {
  actionClassId: string;
}

/** `GET /api/v1/management/action-classes/{actionClassId}` */
const actionClassGet: ActionDefinition<Input> = {
  key: "action-class-get",
  type: "read",
  resource: "action-class",
  title: "Get Action Class",
  description: "Fetch one action class by ID.",
  params: [
    {
      "key": "actionClassId",
      "label": "Action class ID",
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
      `/management/action-classes/${seg(input.actionClassId)}`,
    );
    return { data: res.data ?? null };
  },
};

export default actionClassGet;
