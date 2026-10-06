import type { ActionDefinition } from "@w6w/types";
import {
  COUNT_PARAM,
  LATEST_PARAM,
  OFFSET_PARAM,
  OLDEST_PARAM,
  RocketChatClient,
} from "../lib/client.ts";

interface Input {
  roomId: string;
  latest?: string;
  oldest?: string;
  inclusive?: boolean;
  unreads?: boolean;
  count?: number;
  offset?: number;
}

const getGroupHistory: ActionDefinition<Input> = {
  key: "get-group-history",
  type: "read",
  resource: "group",
  title: "Get Private Group History",
  description: "Read the messages of a private group, optionally within a time range " +
    "(`GET /groups.history`). Takes a room ID only — there is no name lookup on this endpoint.",
  params: [
    { key: "roomId", label: "Group ID", type: "string", required: true },
    { ...LATEST_PARAM },
    { ...OLDEST_PARAM },
    {
      key: "inclusive",
      label: "Inclusive",
      type: "boolean",
      hint: "Include messages exactly at the bounds.",
    },
    { key: "unreads", label: "Include unread count", type: "boolean" },
    { ...COUNT_PARAM },
    { ...OFFSET_PARAM },
  ],
  output: [{ key: "messages", type: "array", label: "Messages, newest first" }],

  execute(input, ctx) {
    return new RocketChatClient(ctx).request("/groups.history", {
      query: {
        roomId: input.roomId,
        latest: input.latest,
        oldest: input.oldest,
        inclusive: input.inclusive,
        unreads: input.unreads,
        count: input.count,
        offset: input.offset,
      },
    });
  },
};

export default getGroupHistory;
