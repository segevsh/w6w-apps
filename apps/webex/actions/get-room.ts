import type { ActionDefinition } from "@w6w/types";
import { WebexClient } from "../lib/client.ts";

interface Input {
  roomId: string;
}

const getRoom: ActionDefinition<Input> = {
  key: "get-room",
  type: "read",
  resource: "room",
  title: "Get Room",
  description: "Get the details of a single room (space).",
  params: [
    { key: "roomId", label: "Room ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Room ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "type", type: "string", label: "Type" },
  ],

  execute(input, ctx) {
    return new WebexClient(ctx).request(`/rooms/${encodeURIComponent(input.roomId)}`);
  },
};

export default getRoom;
