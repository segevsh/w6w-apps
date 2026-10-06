import type { ActionDefinition } from "@w6w/types";
import { encodeId, groupResult, SolapiClient } from "../lib/client.ts";

/**
 * Schedule Message Group — Schedule a PENDING group to send at a future time, from now up to 6 months out. Cancel with Cancel Group Schedule.
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
interface Input {
  groupId: string;
  scheduledDate: string;
}

const scheduleGroup: ActionDefinition<Input> = {
  key: "schedule-group",
  type: "perform",
  resource: "group",
  title: "Schedule Message Group",
  description:
    "Schedule a PENDING group to send at a future time, from now up to 6 months out. Cancel with Cancel Group Schedule.",
  idempotent: false,
  params: [
    {
      "key": "groupId",
      "label": "Group ID",
      "type": "string",
      "required": true,
      "hint": "A PENDING group with messages added.",
    },
    {
      "key": "scheduledDate",
      "label": "Scheduled date",
      "type": "string",
      "required": true,
      "hint": "ISO 8601 with a time zone, e.g. 2026-10-07T09:00:00+09:00.",
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
        method: "POST",
        body: { scheduledDate: input.scheduledDate },
      }),
    );
  },
};

export default scheduleGroup;
