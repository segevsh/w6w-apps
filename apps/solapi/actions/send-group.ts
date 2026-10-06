import type { ActionDefinition } from "@w6w/types";
import { encodeId, groupResult, SolapiClient } from "../lib/client.ts";

/**
 * Send Message Group — Send a PENDING group now. The group moves to SENDING and can no longer be edited; delivery is asynchronous, so poll Get Message Group or use a webhook for results.
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
interface Input {
  groupId: string;
}

const sendGroup: ActionDefinition<Input> = {
  key: "send-group",
  type: "perform",
  resource: "group",
  title: "Send Message Group",
  description:
    "Send a PENDING group now. The group moves to SENDING and can no longer be edited; delivery is asynchronous, so poll Get Message Group or use a webhook for results.",
  idempotent: false,
  params: [
    {
      "key": "groupId",
      "label": "Group ID",
      "type": "string",
      "required": true,
      "hint": "A PENDING group with messages added.",
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
      await new SolapiClient(ctx).json(`/messages/v4/groups/${encodeId(input.groupId)}/send`, {
        method: "POST",
      }),
    );
  },
};

export default sendGroup;
