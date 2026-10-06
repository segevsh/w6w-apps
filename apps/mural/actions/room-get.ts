import type { ActionDefinition } from "@w6w/types";
import { encodeId, one } from "../lib/client.ts";
import { int } from "../lib/params.ts";

/**
 * `GET /rooms/{roomId}` (Mural public API v1). OAuth scope: `rooms:read`.
 */
type Input = {
  roomId: number;
};

const roomGet: ActionDefinition<Input> = {
  key: "room-get",
  type: "read",
  resource: "room",
  title: "Get Room",
  description: "Fetch one room. Needs the `rooms:read` OAuth scope.",
  params: [
    int("roomId", "Room ID", { required: true, hint: "Numeric room ID." }),
  ],
  output: [
    { key: "id", type: "number", label: "Room ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "open or private" },
    { key: "workspaceId", type: "string", label: "Workspace ID" },
  ],

  execute(input, ctx) {
    return one(ctx, "GET", `/rooms/${encodeId(input.roomId)}`);
  },
};

export default roomGet;
