import type { ActionDefinition } from "@w6w/types";
import { one, pick } from "../lib/client.ts";
import { bool, int, num, str } from "../lib/params.ts";

/**
 * `POST /murals` (Mural public API v1). OAuth scope: `murals:write`.
 */
type Input = {
  roomId: number;
  title?: string;
  folderId?: string;
  infinite?: boolean;
  width?: number;
  height?: number;
  backgroundColor?: string;
};

const muralCreate: ActionDefinition<Input> = {
  key: "mural-create",
  type: "perform",
  resource: "mural",
  title: "Create Mural",
  description: "Create a mural in a room. Needs the `murals:write` OAuth scope.",
  idempotent: false,
  params: [
    int("roomId", "Room ID", { required: true, hint: "Numeric room ID." }),
    str("title", "Title"),
    str("folderId", "Folder ID"),
    bool("infinite", "Infinite canvas"),
    num("width", "Width"),
    num("height", "Height"),
    str("backgroundColor", "Background colour", { hint: "Hex colour with alpha, e.g. #FFFFFFFF." }),
  ],
  output: [
    { key: "id", type: "string", label: "Mural ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "roomId", type: "number", label: "Room ID" },
    { key: "workspaceId", type: "string", label: "Workspace ID" },
    { key: "status", type: "string", label: "active or archived" },
    { key: "createdOn", type: "number", label: "Created (epoch ms)" },
  ],

  execute(input, ctx) {
    return one(ctx, "POST", `/murals`, {
      body: pick(input, [
        "roomId",
        "title",
        "folderId",
        "infinite",
        "width",
        "height",
        "backgroundColor",
      ]),
    });
  },
};

export default muralCreate;
