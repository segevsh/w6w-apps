import type { ActionDefinition } from "@w6w/types";
import { CloudinaryClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /folders` and `GET /folders/{path}` — the folder tree, one level at a
 * time.
 *
 * Cloudinary does not return a tree: each call lists the folders **directly
 * under** the path given, so walking the whole structure is one call per level.
 * That is why the path is a parameter rather than the action being "list
 * everything".
 *
 * Which folders exist at all depends on the account's mode. In a **fixed**
 * folder account a folder is implied by the public ids inside it and cannot be
 * empty for long; in a **dynamic** folder account (the newer default) folders
 * are real objects that exist independently of the assets, and an asset's
 * folder is a field rather than a prefix of its id.
 */
const action: ActionDefinition = {
  key: "folder-list",
  type: "read",
  resource: "folder",
  title: "List folders",
  description:
    "The folders directly under a path — one level per call, since Cloudinary returns no tree.",
  params: [
    {
      key: "path",
      label: "Parent Folder",
      type: "string",
      default: "",
      placeholder: "products",
      hint: "Empty lists the top level. Otherwise lists what is directly inside this folder.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "folders", type: "array", label: "Folders" },
    { key: "total_count", type: "number", label: "Total" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const path = String(p.path ?? "").trim().replace(/^\/+|\/+$/g, "");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const folders = await new CloudinaryClient(ctx).requestAll(
      path ? `/folders/${path.split("/").map(encodeURIComponent).join("/")}` : "/folders",
      "folders",
      {},
      returnAll ? Infinity : limit,
    );
    return { folders, total_count: folders.length };
  },
};

export default action;
