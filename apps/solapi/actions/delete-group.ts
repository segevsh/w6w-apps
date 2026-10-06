import type { ActionDefinition } from "@w6w/types";
import { encodeId, groupResult, SolapiClient } from "../lib/client.ts";

/**
 * Delete Message Group — Delete a PENDING group; its messages are never sent. A group that has started sending cannot be deleted.
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
interface Input {
  groupId: string;
}

const deleteGroup: ActionDefinition<Input> = {
  key: "delete-group",
  type: "perform",
  resource: "group",
  title: "Delete Message Group",
  description:
    "Delete a PENDING group; its messages are never sent. A group that has started sending cannot be deleted.",
  idempotent: false,
  params: [
    {
      "key": "groupId",
      "label": "Group ID",
      "type": "string",
      "required": true,
      "hint": "A PENDING group.",
    },
  ],
  output: [
    {
      "key": "groupId",
      "type": "string",
      "label": "Group ID",
    },
    {
      "key": "status",
      "type": "string",
      "label": "Group status",
    },
    {
      "key": "scheduledDate",
      "type": "string",
      "label": "Scheduled send time, null when not scheduled",
    },
    {
      "key": "count",
      "type": "object",
      "label": "Group counters",
    },
    {
      "key": "group",
      "type": "object",
      "label": "The whole group object",
    },
  ],

  async execute(input, ctx) {
    return groupResult(
      await new SolapiClient(ctx).json(`/messages/v4/groups/${encodeId(input.groupId)}`, {
        method: "DELETE",
      }),
    );
  },
};

export default deleteGroup;
