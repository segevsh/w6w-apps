import type { ActionDefinition } from "@w6w/types";
import { encodeId, groupResult, SolapiClient } from "../lib/client.ts";

/**
 * Cancel Group Schedule — Cancel a SCHEDULED group. It returns to PENDING with its messages intact, so it can be edited or rescheduled.
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
interface Input {
  groupId: string;
}

const cancelGroupSchedule: ActionDefinition<Input> = {
  key: "cancel-group-schedule",
  type: "perform",
  resource: "group",
  title: "Cancel Group Schedule",
  description:
    "Cancel a SCHEDULED group. It returns to PENDING with its messages intact, so it can be edited or rescheduled.",
  idempotent: false,
  params: [
    {
      "key": "groupId",
      "label": "Group ID",
      "type": "string",
      "required": true,
      "hint": "A SCHEDULED group.",
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
      await new SolapiClient(ctx).json(`/messages/v4/groups/${encodeId(input.groupId)}/schedule`, {
        method: "DELETE",
      }),
    );
  },
};

export default cancelGroupSchedule;
