import type { ActionDefinition } from "@w6w/types";
import { CloudinaryClient } from "../lib/client.ts";

/**
 * `POST /folders/{path}` — create a folder, including any missing parents.
 *
 * Only meaningful in a **dynamic-folder** account, where folders are real
 * objects. In a fixed-folder account a folder exists because assets have public
 * ids inside it, and creating an empty one has nothing to hold on to — uploading
 * with a `folder` parameter is how one comes into being there.
 *
 * Creating a folder that already exists is not an error, which is what makes
 * this safe to run at the start of an ingest.
 */
const action: ActionDefinition = {
  key: "folder-create",
  type: "perform",
  resource: "folder",
  title: "Create folder",
  description:
    "Create a folder and any missing parents. Dynamic-folder accounts only — in a fixed-folder " +
    "account, folders come from the assets' public ids.",
  idempotent: true,
  params: [
    {
      key: "path",
      label: "Folder Path",
      type: "string",
      required: true,
      default: "",
      placeholder: "products/2026/spring",
      hint: "Intermediate folders are created too.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Created" },
    { key: "path", type: "string", label: "Path" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const path = String(p.path ?? "").trim().replace(/^\/+|\/+$/g, "");
    if (!path) throw new Error("`path` is required");

    return await new CloudinaryClient(ctx).request(
      `/folders/${path.split("/").map(encodeURIComponent).join("/")}`,
      { method: "POST" },
    );
  },
};

export default action;
