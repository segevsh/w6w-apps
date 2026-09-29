import type { ActionDefinition } from "@w6w/types";
import { WebexClient } from "../lib/client.ts";

interface Input {
  roomId: string;
}

const deleteRoom: ActionDefinition<Input> = {
  key: "delete-room",
  type: "perform",
  resource: "room",
  title: "Delete Room",
  description: "Delete a room (space) and its contents. Irreversible.",
  idempotent: true,
  params: [
    { key: "roomId", label: "Room ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    await new WebexClient(ctx).request(`/rooms/${encodeURIComponent(input.roomId)}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default deleteRoom;
