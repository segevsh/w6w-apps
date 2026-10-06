import type { ActionDefinition } from "@w6w/types";
import { encodeId, groupResult, SolapiClient } from "../lib/client.ts";

/**
 * Get Message Group — Get one message group: its status, scheduled time, message counts and charge breakdown.
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
interface Input {
  groupId: string;
}

const getGroup: ActionDefinition<Input> = {
  key: "get-group",
  type: "read",
  resource: "group",
  title: "Get Message Group",
  description:
    "Get one message group: its status, scheduled time, message counts and charge breakdown.",
  params: [
    {
      "key": "groupId",
      "label": "Group ID",
      "type": "string",
      "required": true,
      "hint": "Starts with G4V.",
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
      await new SolapiClient(ctx).json(`/messages/v4/groups/${encodeId(input.groupId)}`),
    );
  },
};

export default getGroup;
