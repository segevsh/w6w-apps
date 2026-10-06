import type { ActionDefinition } from "@w6w/types";
import { encodeId, none } from "../lib/client.ts";
import { int } from "../lib/params.ts";

/**
 * `DELETE /rooms/{roomId}` (Mural public API v1). OAuth scope: `rooms:write`.
 */
type Input = {
  roomId: number;
};

const roomDelete: ActionDefinition<Input> = {
  key: "room-delete",
  type: "perform",
  resource: "room",
  title: "Delete Room",
  description: "Delete a room. Irreversible. Needs the `rooms:write` OAuth scope.",
  idempotent: true,
  params: [
    int("roomId", "Room ID", { required: true, hint: "Numeric room ID." }),
  ],
  output: [
    { key: "deleted", type: "boolean", label: "true when the room was deleted" },
    { key: "id", type: "string", label: "Deleted ID" },
  ],

  execute(input, ctx) {
    return none(ctx, "DELETE", `/rooms/${encodeId(input.roomId)}`, {}, String(input.roomId));
  },
};

export default roomDelete;
