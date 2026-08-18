import type { ActionDefinition } from "@w6w/types";
import { CloudinaryClient } from "../lib/client.ts";

/**
 * `DELETE /folders/{path}` — remove a folder.
 *
 * **Cloudinary refuses to delete a folder that still contains assets**, which
 * is the guard that makes this action safe without a confirmation flag: the
 * worst case is an error, not a silent mass deletion. Emptying it first is
 * `asset-delete` with a prefix — which *does* require confirming, because that
 * one really can remove everything.
 *
 * Deleting a folder that is already gone answers with an error rather than
 * succeeding quietly, so a teardown workflow should tolerate that.
 */
const action: ActionDefinition = {
  key: "folder-delete",
  type: "perform",
  resource: "folder",
  title: "Delete folder",
  description:
    "Delete an empty folder. Cloudinary refuses while it still holds assets, which is why this " +
    "needs no confirmation — emptying it is a separate, gated step.",
  idempotent: true,
  params: [
    {
      key: "path",
      label: "Folder Path",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [
    { key: "deleted", type: "array", label: "Deleted folders" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const path = String(p.path ?? "").trim().replace(/^\/+|\/+$/g, "");
    if (!path) throw new Error("`path` is required");

    ctx.log("info", "deleting Cloudinary folder", { path });
    return await new CloudinaryClient(ctx).request(
      `/folders/${path.split("/").map(encodeURIComponent).join("/")}`,
      { method: "DELETE" },
    );
  },
};

export default action;
