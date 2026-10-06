import type { ActionDefinition } from "@w6w/types";
import { encodeId, one, pick } from "../lib/client.ts";
import { bool, int, str } from "../lib/params.ts";

/**
 * `POST /murals/{muralId}/duplicate` (Mural public API v1). OAuth scope: `murals:write`.
 */
type Input = {
  muralId: string;
  roomId: number;
  title: string;
  folderId?: string;
  infinite?: boolean;
};

const muralDuplicate: ActionDefinition<Input> = {
  key: "mural-duplicate",
  type: "perform",
  resource: "mural",
  title: "Duplicate Mural",
  description: "Copy a mural into a room under a new title. Needs the `murals:write` OAuth scope.",
  idempotent: false,
  params: [
    str("muralId", "Mural ID", {
      required: true,
      hint: 'The mural ID, e.g. "ws12345.1608152669000".',
    }),
    int("roomId", "Room ID", { required: true, hint: "Numeric room ID." }),
    str("title", "New title", { required: true }),
    str("folderId", "Folder ID"),
    bool("infinite", "Infinite canvas"),
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
    return one(ctx, "POST", `/murals/${encodeId(input.muralId)}/duplicate`, {
      body: pick(input, ["roomId", "title", "folderId", "infinite"]),
    });
  },
};

export default muralDuplicate;
