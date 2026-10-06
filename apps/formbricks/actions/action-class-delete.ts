import type { ActionDefinition } from "@w6w/types";
import { FormbricksClient, seg } from "../lib/client.ts";

interface Input {
  actionClassId: string;
}

/** `DELETE /api/v1/management/action-classes/{actionClassId}` */
const actionClassDelete: ActionDefinition<Input> = {
  key: "action-class-delete",
  type: "perform",
  resource: "action-class",
  title: "Delete Action Class",
  description: "Delete an action class. Automatic action classes cannot be deleted (400).",
  idempotent: true,
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
      "DELETE",
      `/management/action-classes/${seg(input.actionClassId)}`,
    );
    return { data: res.data ?? null };
  },
};

export default actionClassDelete;
