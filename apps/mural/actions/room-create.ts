import type { ActionDefinition } from "@w6w/types";
import { one, pick } from "../lib/client.ts";
import { bool, select, str } from "../lib/params.ts";

/**
 * `POST /rooms` (Mural public API v1). OAuth scope: `rooms:write`.
 */
type Input = {
  workspaceId: string;
  name: string;
  type: string;
  description?: string;
  confidential?: boolean;
};

const roomCreate: ActionDefinition<Input> = {
  key: "room-create",
  type: "perform",
  resource: "room",
  title: "Create Room",
  description: "Create a room in a workspace. Needs the `rooms:write` OAuth scope.",
  idempotent: false,
  params: [
    str("workspaceId", "Workspace ID", {
      required: true,
      hint: "The workspace ID, e.g. from List Workspaces.",
    }),
    str("name", "Name", { required: true }),
    select("type", "Type", ["open", "private"], { required: true }),
    str("description", "Description"),
    bool("confidential", "Confidential"),
  ],
  output: [
    { key: "id", type: "number", label: "Room ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "open or private" },
    { key: "workspaceId", type: "string", label: "Workspace ID" },
  ],

  execute(input, ctx) {
    return one(ctx, "POST", `/rooms`, {
      body: pick(input, ["workspaceId", "name", "type", "description", "confidential"]),
    });
  },
};

export default roomCreate;
