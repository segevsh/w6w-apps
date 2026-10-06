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

const getDmHistory: ActionDefinition<Input> = {
  key: "get-dm-history",
  type: "read",
  resource: "direct-message",
  title: "Get Direct Message History",
  description: "Read the messages of a direct-message room, optionally within a time range " +
    "(`GET /dm.history`).",
  params: [
    { key: "roomId", label: "DM room ID", type: "string", required: true },
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
    return new RocketChatClient(ctx).request("/dm.history", {
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

export default getDmHistory;
