import type { ActionDefinition } from "@w6w/types";
import {
  COUNT_PARAM,
  OFFSET_PARAM,
  requireRoom,
  RocketChatClient,
  ROOM_ID_PARAM,
  ROOM_NAME_PARAM,
  SORT_PARAM,
} from "../lib/client.ts";

interface Input {
  roomId?: string;
  roomName?: string;
  filter?: string;
  count?: number;
  offset?: number;
  sort?: string;
}

const listChannelMembers: ActionDefinition<Input> = {
  key: "list-channel-members",
  type: "read",
  resource: "channel",
  title: "List Channel Members",
  description: "List the members of a public channel (`GET /channels.members`).",
  params: [
    { ...ROOM_ID_PARAM },
    { ...ROOM_NAME_PARAM },
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint: "Text matched against the workspace's user search fields.",
    },
    { ...COUNT_PARAM },
    { ...OFFSET_PARAM },
    { ...SORT_PARAM },
  ],
  output: [
    { key: "members", type: "array", label: "Members" },
    { key: "total", type: "number", label: "Total members" },
  ],

  execute(input, ctx) {
    requireRoom(input);
    return new RocketChatClient(ctx).request("/channels.members", {
      query: {
        roomId: input.roomId,
        roomName: input.roomName,
        filter: input.filter,
        count: input.count,
        offset: input.offset,
        sort: input.sort,
      },
    });
  },
};

export default listChannelMembers;
