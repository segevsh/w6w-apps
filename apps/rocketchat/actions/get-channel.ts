import type { ActionDefinition } from "@w6w/types";
import { requireRoom, RocketChatClient, ROOM_ID_PARAM, ROOM_NAME_PARAM } from "../lib/client.ts";

interface Input {
  roomId?: string;
  roomName?: string;
}

const getChannel: ActionDefinition<Input> = {
  key: "get-channel",
  type: "read",
  resource: "channel",
  title: "Get Channel",
  description: "Fetch a public channel by ID or name (`GET /channels.info`).",
  params: [{ ...ROOM_ID_PARAM }, { ...ROOM_NAME_PARAM }],
  output: [{ key: "channel", type: "object", label: "The channel" }],

  execute(input, ctx) {
    requireRoom(input);
    return new RocketChatClient(ctx).request("/channels.info", {
      query: { roomId: input.roomId, roomName: input.roomName },
    });
  },
};

export default getChannel;
