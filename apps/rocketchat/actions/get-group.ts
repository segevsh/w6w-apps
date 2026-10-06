import type { ActionDefinition } from "@w6w/types";
import { requireRoom, RocketChatClient, ROOM_ID_PARAM, ROOM_NAME_PARAM } from "../lib/client.ts";

interface Input {
  roomId?: string;
  roomName?: string;
}

const getGroup: ActionDefinition<Input> = {
  key: "get-group",
  type: "read",
  resource: "group",
  title: "Get Private Group",
  description: "Fetch a private group by ID or name (`GET /groups.info`).",
  params: [{ ...ROOM_ID_PARAM }, { ...ROOM_NAME_PARAM }],
  output: [{ key: "group", type: "object", label: "The private group" }],

  execute(input, ctx) {
    requireRoom(input);
    return new RocketChatClient(ctx).request("/groups.info", {
      query: { roomId: input.roomId, roomName: input.roomName },
    });
  },
};

export default getGroup;
