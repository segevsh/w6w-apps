import type { ActionDefinition } from "@w6w/types";
import { encodeId, one, pick } from "../lib/client.ts";
import { bool, int, select, str } from "../lib/params.ts";

/**
 * `PATCH /murals/{muralId}` (Mural public API v1). OAuth scope: `murals:write`.
 */
type Input = {
  muralId: string;
  title?: string;
  status?: string;
  favorite?: boolean;
  folderId?: string;
  infinite?: boolean;
  width?: number;
  height?: number;
  backgroundColor?: string;
  visitorsPermission?: string;
  workspaceMembersPermission?: string;
};

const muralUpdate: ActionDefinition<Input> = {
  key: "mural-update",
  type: "perform",
  resource: "mural",
  title: "Update Mural",
  description:
    "Update a mural: title, archive state, colour, size or permissions. Needs the `murals:write` OAuth scope.",
  idempotent: true,
  params: [
    str("muralId", "Mural ID", {
      required: true,
      hint: 'The mural ID, e.g. "ws12345.1608152669000".',
    }),
    str("title", "Title"),
    select("status", "Status", ["active", "archived"]),
    bool("favorite", "Favorite"),
    str("folderId", "Folder ID"),
    bool("infinite", "Infinite canvas"),
    int("width", "Width"),
    int("height", "Height"),
    str("backgroundColor", "Background colour"),
    select("visitorsPermission", "Visitors permission", ["read", "write", "none"]),
    select("workspaceMembersPermission", "Workspace members permission", ["read", "write", "none"]),
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
    return one(ctx, "PATCH", `/murals/${encodeId(input.muralId)}`, {
      body: pick(input, [
        "title",
        "status",
        "favorite",
        "folderId",
        "infinite",
        "width",
        "height",
        "backgroundColor",
        "visitorsPermission",
        "workspaceMembersPermission",
      ]),
    });
  },
};

export default muralUpdate;
