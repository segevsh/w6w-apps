import type { ActionDefinition } from "@w6w/types";
import { encodeId, SolapiClient } from "../lib/client.ts";

/**
 * List Group Messages — List the messages inside one group, before or after sending. Cursor-paged.
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
interface Input {
  groupId: string;
  limit?: number;
  startKey?: string;
}

const listGroupMessages: ActionDefinition<Input> = {
  key: "list-group-messages",
  type: "read",
  resource: "group",
  title: "List Group Messages",
  description: "List the messages inside one group, before or after sending. Cursor-paged.",
  params: [
    {
      "key": "groupId",
      "label": "Group ID",
      "type": "string",
      "required": true,
      "hint": "Starts with G4V.",
    },
    {
      "key": "limit",
      "label": "Page size",
      "type": "number",
      "hint": "Rows per page.",
    },
    {
      "key": "startKey",
      "label": "Start key",
      "type": "string",
      "hint": "`nextKey` from the previous page, to fetch the next one.",
    },
  ],
  output: [
    {
      "key": "items",
      "type": "array",
      "label": "Messages on this page",
    },
    {
      "key": "count",
      "type": "number",
      "label": "Rows on this page",
    },
    {
      "key": "nextKey",
      "type": "string",
      "label": "Cursor for the next page, null on the last page",
    },
    {
      "key": "limit",
      "type": "number",
      "label": "Page size applied",
    },
  ],

  execute(input, ctx) {
    return new SolapiClient(ctx).page(
      `/messages/v4/groups/${encodeId(input.groupId)}/messages`,
      "messageList",
      { query: { limit: input.limit, startKey: input.startKey } },
    );
  },
};

export default listGroupMessages;
