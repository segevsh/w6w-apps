import type { ActionDefinition } from "@w6w/types";
import { encodeId, one, pick } from "../lib/client.ts";
import { bool, int, select, str } from "../lib/params.ts";

/**
 * `PATCH /rooms/{roomId}` (Mural public API v1). OAuth scope: `rooms:write`.
 */
type Input = {
  roomId: number;
  name?: string;
  description?: string;
  type?: string;
  favorite?: boolean;
};

const roomUpdate: ActionDefinition<Input> = {
  key: "room-update",
  type: "perform",
  resource: "room",
  title: "Update Room",
  description:
    "Update a room's name, description, type or favorite flag. Needs the `rooms:write` OAuth scope.",
  idempotent: true,
  params: [
    int("roomId", "Room ID", { required: true, hint: "Numeric room ID." }),
    str("name", "Name"),
    str("description", "Description"),
    select("type", "Type", ["open", "private"]),
    bool("favorite", "Favorite"),
  ],
  output: [
    { key: "id", type: "number", label: "Room ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "open or private" },
    { key: "workspaceId", type: "string", label: "Workspace ID" },
  ],

  execute(input, ctx) {
    return one(ctx, "PATCH", `/rooms/${encodeId(input.roomId)}`, {
      body: pick(input, ["name", "description", "type", "favorite"]),
    });
  },
};

export default roomUpdate;
