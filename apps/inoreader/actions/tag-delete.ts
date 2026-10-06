import type { ActionDefinition } from "@w6w/types";
import { InoreaderClient } from "../lib/client.ts";

/**
 * `POST /reader/api/0/disable-tag` (zone 2) — the "Delete tag" method; deletes a tag or folder.
 * `s` is the full tag name. Answers `OK`.
 */
interface Input {
  tag: string;
}

const tagDelete: ActionDefinition<Input> = {
  key: "tag-delete",
  type: "perform",
  resource: "tags",
  title: "Delete Folder or Tag",
  description: "Delete a folder or tag.",
  idempotent: true,
  params: [
    {
      key: "tag",
      label: "Folder or tag",
      type: "string",
      required: true,
      placeholder: "user/-/label/Tech",
      hint: "The full name, `user/-/label/<name>`.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Inoreader confirmed with OK" }],

  async execute(input, ctx) {
    const s = (input.tag ?? "").trim();
    if (!s) throw new Error("tag is required");
    await new InoreaderClient(ctx).ok("/disable-tag", { query: { s } });
    return { ok: true };
  },
};

export default tagDelete;
