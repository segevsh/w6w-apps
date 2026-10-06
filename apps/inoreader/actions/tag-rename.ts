import type { ActionDefinition } from "@w6w/types";
import { InoreaderClient } from "../lib/client.ts";

/**
 * `POST /reader/api/0/rename-tag` (zone 2) — rename a tag or folder. `s` is the full source name
 * (`user/-/label/Tech`); `dest` is the new name and "cannot contain forward slashes (they are
 * forbidden in folder names)" — so it is the bare new name, not a full tag path. Answers `OK`.
 */
interface Input {
  tag: string;
  newName: string;
}

const tagRename: ActionDefinition<Input> = {
  key: "tag-rename",
  type: "perform",
  resource: "tags",
  title: "Rename Folder or Tag",
  description: "Rename a folder or tag.",
  idempotent: false,
  params: [
    {
      key: "tag",
      label: "Folder or tag",
      type: "string",
      required: true,
      placeholder: "user/-/label/Tech",
      hint: "The full name, `user/-/label/<name>`.",
    },
    {
      key: "newName",
      label: "New name",
      type: "string",
      required: true,
      hint: "The bare name. Forward slashes are not allowed.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Inoreader confirmed with OK" }],

  async execute(input, ctx) {
    const s = (input.tag ?? "").trim();
    const dest = (input.newName ?? "").trim();
    if (!s) throw new Error("tag is required");
    if (!dest) throw new Error("newName is required");
    if (dest.includes("/")) throw new Error("newName cannot contain forward slashes");
    await new InoreaderClient(ctx).ok("/rename-tag", { query: { s, dest } });
    return { ok: true };
  },
};

export default tagRename;
