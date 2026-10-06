import type { ActionDefinition } from "@w6w/types";
import {
  COUNT_PARAM,
  LATEST_PARAM,
  OFFSET_PARAM,
  OLDEST_PARAM,
  requireRoom,
  RocketChatClient,
  ROOM_ID_PARAM,
  ROOM_NAME_PARAM,
} from "../lib/client.ts";

interface Input {
  roomId?: string;
  roomName?: string;
  latest?: string;
  oldest?: string;
  inclusive?: boolean;
  showThreadMessages?: boolean;
  unreads?: boolean;
  count?: number;
  offset?: number;
}

// The spec's 200 SCHEMA for `channels.history` is a copy of a files listing (`files[]`), but its
// own example — and the server — return `messages[]`. The output below follows the example.
const getChannelHistory: ActionDefinition<Input> = {
  key: "get-channel-history",
  type: "read",
  resource: "channel",
  title: "Get Channel History",
  description: "Read the messages of a public channel, optionally within a time range " +
    "(`GET /channels.history`).",
  params: [
    { ...ROOM_ID_PARAM },
    { ...ROOM_NAME_PARAM },
    { ...LATEST_PARAM },
    { ...OLDEST_PARAM },
    {
      key: "inclusive",
      label: "Inclusive",
      type: "boolean",
      hint: "Include messages exactly at the bounds.",
    },
    { key: "showThreadMessages", label: "Show thread messages", type: "boolean" },
    { key: "unreads", label: "Include unread count", type: "boolean" },
    { ...COUNT_PARAM },
    { ...OFFSET_PARAM },
  ],
  output: [{ key: "messages", type: "array", label: "Messages, newest first" }],

  execute(input, ctx) {
    requireRoom(input);
    return new RocketChatClient(ctx).request("/channels.history", {
      query: {
        roomId: input.roomId,
        roomName: input.roomName,
        latest: input.latest,
        oldest: input.oldest,
        inclusive: input.inclusive,
        showThreadMessages: input.showThreadMessages,
        unreads: input.unreads,
        count: input.count,
        offset: input.offset,
      },
    });
  },
};

export default getChannelHistory;
